import { db } from '@acme/db/client';
import { log } from '@acme/observability/log';
import { stripeClient } from '@acme/payment/stripe';
import type { TRPCRouterRecord } from '@trpc/server';
import { z } from 'zod/v4';
import { apiEnv } from '../../env';
import { subscriptionRepository } from '../repository/subscription.repository';
import { stripeService } from '../services/stripe/stripe.service';
import { protectedProcedure } from '../trpc';

export const stripeRouter = {
  getPrices: protectedProcedure.query(() => {
    return stripeService.getPrices();
  }),

  getEffectiveSubscription: protectedProcedure.query(async ({ ctx }) => {
    return await subscriptionRepository.findEffectiveForUser(
      ctx.session.user.id
    );
  }),

  createBillingPortalSession: protectedProcedure
    .input(
      z.object({
        returnUrl: z.string().optional().default('/app/billing'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = ctx.session.user as typeof ctx.session.user & {
        stripeCustomerId?: string;
      };
      const customerId = user.stripeCustomerId;

      if (!customerId) {
        throw new Error('No Stripe customer found for user');
      }

      const returnUrl = `${apiEnv().VOICEGECKO_APP_URL}${input.returnUrl}`;

      const billingPortalSession =
        await stripeClient.billingPortal.sessions.create({
          customer: customerId,
          return_url: returnUrl,
        });

      return {
        url: billingPortalSession.url,
      };
    }),

  restoreSubscription: protectedProcedure
    .input(
      z.object({
        subscriptionId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Update the subscription to not cancel at period end
        const subscription = await stripeClient.subscriptions.update(
          input.subscriptionId,
          {
            cancel_at_period_end: false,
          }
        );

        return {
          success: true,
          subscription: {
            id: subscription.id,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          },
        };
      } catch (error) {
        log.error(error, 'Error restoring subscription:');
        throw new Error('Failed to restore subscription');
      }
    }),

  getRecentPurchase: protectedProcedure.query(async ({ ctx }) => {
    try {
      // Get the user's most recent active subscription from the database
      const userSubscription = await db.query.subscription.findFirst({
        where: (table, { eq, and }) =>
          and(
            eq(table.referenceId, ctx.session.user.id),
            eq(table.status, 'active')
          ),
        orderBy: (table, { desc }) => desc(table.periodStart),
      });

      if (!userSubscription?.stripeSubscriptionId) {
        return null;
      }

      // Get the full subscription details from Stripe
      const stripeSubscription = await stripeClient.subscriptions.retrieve(
        userSubscription.stripeSubscriptionId,
        {
          expand: ['latest_invoice'],
        }
      );

      if (!stripeSubscription || stripeSubscription.status !== 'active') {
        return null;
      }

      // Use the latest invoice for accurate payment data (actual currency/amount paid)
      const latestInvoice = stripeSubscription.latest_invoice;
      if (!latestInvoice || typeof latestInvoice === 'string') {
        return null;
      }

      const priceId = stripeSubscription.items.data[0]?.price.id;
      const isAnnual =
        stripeSubscription.items.data[0]?.price.recurring?.interval === 'year';

      // Use actual amounts and currency from the invoice (what customer actually paid)
      const actualAmountPaid = latestInvoice.amount_paid; // Amount in the smallest currency unit
      const actualCurrency = latestInvoice.currency;

      return {
        userId: ctx.session.user.id,
        transactionId: stripeSubscription.id, // Use subscription ID as transaction ID
        value: actualAmountPaid / 100, // Convert from smallest currency unit to main unit
        currency: actualCurrency.toUpperCase(),
        planType: 'pro' as const,
        billingPeriod: isAnnual ? ('yearly' as const) : ('monthly' as const),
        priceId,
        subscriptionId: stripeSubscription.id,
        createdAt: stripeSubscription.created,
        // Additional useful data
        invoiceId: latestInvoice.id,
        invoiceNumber: latestInvoice.number,
        email: ctx.session.user.email,
      };
    } catch (error) {
      log.error(error, 'Error getting recent purchase:');
      return null;
    }
  }),
} satisfies TRPCRouterRecord;
