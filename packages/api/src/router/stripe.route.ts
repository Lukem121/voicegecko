import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";

import { apiEnv } from "../../env";
import { stripeClient } from "../lib/stripe";
import { protectedProcedure } from "../trpc";

type PriceId = string;

export interface Price {
  id: string;
  currency: string;
  unitAmount: number;
  interval: string;
  intervalCount: number;
}

export interface PriceWithMetadata extends Price {
  planName?: string;
  intervalType?: "monthly" | "yearly";
  minimumQuantity?: number;
}

// Map environment variables to plan metadata
const PRICE_METADATA = {
  [apiEnv().STRIPE_PRICE_ID_PRO_MONTHLY]: {
    planName: "voice gecko pro",
    intervalType: "monthly" as const,
    minimumQuantity: 1,
  },
  [apiEnv().STRIPE_PRICE_ID_PRO_YEARLY]: {
    planName: "voice gecko pro",
    intervalType: "yearly" as const,
    minimumQuantity: 1,
  },
  [apiEnv().STRIPE_PRICE_ID_TEAM_MONTHLY]: {
    planName: "voice gecko team",
    intervalType: "monthly" as const,
    minimumQuantity: 3,
  },
  [apiEnv().STRIPE_PRICE_ID_TEAM_YEARLY]: {
    planName: "voice gecko team",
    intervalType: "yearly" as const,
    minimumQuantity: 3,
  },
};

export const stripeRouter = {
  getPrices: protectedProcedure.query(async () => {
    const priceIds = [
      apiEnv().STRIPE_PRICE_ID_PRO_MONTHLY,
      apiEnv().STRIPE_PRICE_ID_PRO_YEARLY,
      apiEnv().STRIPE_PRICE_ID_TEAM_MONTHLY,
      apiEnv().STRIPE_PRICE_ID_TEAM_YEARLY,
    ];

    const prices = await Promise.all(
      priceIds.map((id) => stripeClient.prices.retrieve(id)),
    );

    // Transform the data into a more usable format with metadata
    const priceData = prices.reduce(
      (acc, price) => {
        const metadata =
          PRICE_METADATA[price.id as keyof typeof PRICE_METADATA];

        acc[price.id] = {
          id: price.id,
          currency: price.currency,
          unitAmount: price.unit_amount ?? 0,
          interval: price.recurring?.interval ?? "month",
          intervalCount: price.recurring?.interval_count ?? 1,
          planName: metadata?.planName,
          intervalType: metadata?.intervalType,
          minimumQuantity: metadata?.minimumQuantity,
        };
        return acc;
      },
      {} as Record<PriceId, PriceWithMetadata>,
    );

    return priceData;
  }),

  createBillingPortalSession: protectedProcedure
    .input(
      z.object({
        returnUrl: z.string().optional().default("/app/billing"),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const customerId = ctx.session.user.stripeCustomerId;

      if (!customerId) {
        throw new Error("No Stripe customer found for user");
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
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Update the subscription to not cancel at period end
        const subscription = await stripeClient.subscriptions.update(
          input.subscriptionId,
          {
            cancel_at_period_end: false,
          },
        );

        return {
          success: true,
          subscription: {
            id: subscription.id,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          },
        };
      } catch (error) {
        console.error("Error restoring subscription:", error);
        throw new Error("Failed to restore subscription");
      }
    }),
} satisfies TRPCRouterRecord;
