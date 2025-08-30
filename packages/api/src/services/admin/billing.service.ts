import { log } from '@acme/observability/log';
import { stripeClient } from '@acme/payment/stripe';
import { TRPCError } from '@trpc/server';
import type { LatestSubscription } from '../../repository/admin/billing.repository';
import { billingRepository } from '../../repository/admin/billing.repository';

export type SubscriptionWithInvoice = LatestSubscription & {
  latestInvoice?: {
    id: string;
    status: string;
    amountPaid: number;
    currency: string;
    created: number;
    hostedInvoiceUrl: string | null;
  } | null;
};

export class BillingService {
  async getUserSubscription(
    userId: string
  ): Promise<SubscriptionWithInvoice | null> {
    const subscription = await billingRepository.getLatestSubscription(userId);

    if (!subscription) {
      return null;
    }

    // Fetch latest invoice details from Stripe if available
    let latestInvoice: {
      id: string;
      status: string;
      amountPaid: number;
      currency: string;
      created: number;
      hostedInvoiceUrl: string | null;
    } | null = null;

    if (subscription.latestInvoiceId) {
      try {
        const invoice = await stripeClient.invoices.retrieve(
          subscription.latestInvoiceId
        );

        if (
          !(
            invoice.id &&
            invoice.status &&
            invoice.amount_paid &&
            invoice.currency &&
            invoice.created &&
            invoice.hosted_invoice_url
          )
        ) {
          return null;
        }

        latestInvoice = {
          id: invoice.id,
          status: invoice.status || 'unknown',
          amountPaid: invoice.amount_paid,
          currency: invoice.currency,
          created: invoice.created,
          hostedInvoiceUrl: invoice.hosted_invoice_url,
        };
      } catch (error) {
        log.error(error, 'Failed to fetch latest invoice');
      }
    }

    return {
      ...subscription,
      latestInvoice,
    };
  }

  async restoreSubscription(userId: string): Promise<void> {
    const subscription = await billingRepository.getLatestSubscription(userId);
    if (!subscription?.stripeSubscriptionId) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'No subscription found for user',
      });
    }

    try {
      await stripeClient.subscriptions.update(
        subscription.stripeSubscriptionId,
        {
          cancel_at_period_end: false,
        }
      );
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to restore subscription',
        cause: error,
      });
    }
  }
}

export const billingService = new BillingService();
