import { sendStudentDiscountEmail } from '@acme/email/send/student-discount';
import { log } from '@acme/observability/log';
import { stripeClient } from '@acme/payment/stripe';
import { createRateLimiter, slidingWindow } from '@acme/rate-limit';
import type { TRPCRouterRecord } from '@trpc/server';
import { z } from 'zod/v4';

import { apiEnv } from '../../env';
import { EDUCATIONAL_DOMAINS } from '../consts/educational-domains';
import { stripeService } from '../services/stripe/stripe.service';
import { protectedProcedure, publicProcedure } from '../trpc';

export const stripeRouter = {
  getPrices: protectedProcedure.query(() => {
    return stripeService.getPrices();
  }),

  createBillingPortalSession: protectedProcedure
    .input(
      z.object({
        returnUrl: z.string().optional().default('/app/billing'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const customerId = ctx.session.user.stripeCustomerId;

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
        log.error('Error restoring subscription:', error);
        throw new Error('Failed to restore subscription');
      }
    }),

  requestStudentDiscount: publicProcedure
    .input(
      z.object({
        email: z.email('Please enter a valid email address'),
      })
    )
    .mutation(async ({ input }) => {
      const limiter = createRateLimiter({
        limiter: slidingWindow(1, '30s'),
        prefix: 'request-student-discount',
      });

      const { success } = await limiter.limit(input.email);

      log.info('success', success);

      if (!success) {
        return {
          success: false,
          error: {
            message: 'Too many requests. Please try again later.',
            code: 'TOO_MANY_REQUESTS',
          },
        };
      }

      try {
        const emailDomain = input.email.toLowerCase();
        const isEducationalEmail = EDUCATIONAL_DOMAINS.some((domain) =>
          emailDomain.endsWith(domain)
        );

        if (!isEducationalEmail) {
          return {
            success: false,
            error: {
              message:
                'Please use your educational email address (.edu, .ac.uk, etc.)',
              code: 'INVALID_EDUCATIONAL_EMAIL',
            },
          };
        }

        // Send the student discount email
        await sendStudentDiscountEmail({
          user: {
            email: input.email,
          },
          couponCode: 'RYGALTMSXJAA',
          discountPercentage: '50',
          redemptionUrl: 'https://www.voicegecko.io/pricing?student=true',
        });

        return {
          success: true,
          data: {
            message: 'Student discount code sent to your email!',
          },
        };
      } catch (error) {
        log.error('Error sending student discount email:', error);
        return {
          success: false,
          error: {
            message: 'Failed to send discount code. Please try again later.',
            code: 'EMAIL_SEND_FAILED',
          },
        };
      }
    }),
} satisfies TRPCRouterRecord;
