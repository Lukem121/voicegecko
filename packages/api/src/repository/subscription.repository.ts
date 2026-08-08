import { and, desc, eq, or } from '@acme/db';
import { db } from '@acme/db/client';
import {
  subscription as SubscriptionTable,
  TeamMemberTable,
  TeamTable,
  user as UserTable,
} from '@acme/db/schema';
import { stripeClient } from '@acme/payment/stripe';
import type { Stripe } from 'stripe';
import { apiEnv } from '../../env';
import { isTeamPriceId } from '../utils/stripe-plan';

export type EffectiveSubscription = {
  id: string;
  plan: string | null;
  status: string | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  cancelAtPeriodEnd: boolean | null;
  seats: number | null;
  stripeSubscriptionId: string | null;
};

export const subscriptionRepository = {
  async findEffectiveForUser(
    userId: string
  ): Promise<EffectiveSubscription | null> {
    const addIntervalSeconds = (
      startSeconds: number,
      interval: 'day' | 'week' | 'month' | 'year',
      count: number
    ): number => {
      const date = new Date(startSeconds * 1000);
      switch (interval) {
        case 'day':
          date.setDate(date.getDate() + count);
          break;
        case 'week':
          date.setDate(date.getDate() + count * 7);
          break;
        case 'month':
          date.setMonth(date.getMonth() + count);
          break;
        case 'year':
          date.setFullYear(date.getFullYear() + count);
          break;
        default:
          break;
      }
      return Math.floor(date.getTime() / 1000);
    };

    const computePeriodFromStripe = (
      sub: Stripe.Subscription
    ): { periodStart: Date | null; periodEnd: Date | null } => {
      const startSeconds =
        // Prefer current period start if available
        (sub as unknown as { current_period_start?: number })
          .current_period_start ??
        sub.start_date ??
        sub.billing_cycle_anchor ??
        sub.created ??
        null;

      const item = sub.items?.data?.[0] ?? null;
      // Prefer price.recurring interval data
      const interval = (item?.price?.recurring?.interval ?? 'month') as
        | 'day'
        | 'week'
        | 'month'
        | 'year';
      const intervalCount = item?.price?.recurring?.interval_count ?? 1;

      const endSeconds =
        (sub as unknown as { current_period_end?: number })
          .current_period_end ??
        (startSeconds != null
          ? addIntervalSeconds(startSeconds, interval, intervalCount)
          : null);

      return {
        periodStart:
          startSeconds != null ? new Date(startSeconds * 1000) : null,
        periodEnd: endSeconds != null ? new Date(endSeconds * 1000) : null,
      };
    };
    // First try personal active/trialing subscriptions (created directly by this user)
    const personalActive = await db
      .select()
      .from(SubscriptionTable)
      .where(
        and(
          eq(SubscriptionTable.referenceId, userId),
          or(
            eq(SubscriptionTable.status, 'active'),
            eq(SubscriptionTable.status, 'trialing')
          )
        )
      )
      .orderBy(desc(SubscriptionTable.periodStart));

    const chosenPersonal = personalActive.at(0) ?? null;
    if (chosenPersonal) {
      // If DB is missing period bounds, enrich from Stripe
      const hasPeriodBounds = Boolean(
        chosenPersonal.periodStart && chosenPersonal.periodEnd
      );
      const hasStripeId = Boolean(chosenPersonal.stripeSubscriptionId);
      if (!hasPeriodBounds && hasStripeId) {
        const stripeSubPersonal = await stripeClient.subscriptions.retrieve(
          chosenPersonal.stripeSubscriptionId as string,
          { expand: ['items'] }
        );
        const personalPeriods = computePeriodFromStripe(stripeSubPersonal);
        const computedPeriodStart = personalPeriods.periodStart;
        const computedPeriodEnd = personalPeriods.periodEnd;
        return {
          id: chosenPersonal.id,
          plan: chosenPersonal.plan,
          status: chosenPersonal.status,
          periodStart: computedPeriodStart,
          periodEnd: computedPeriodEnd,
          cancelAtPeriodEnd: chosenPersonal.cancelAtPeriodEnd ?? null,
          seats:
            stripeSubPersonal.items?.data?.[0]?.quantity ??
            (chosenPersonal as { seats?: number }).seats ??
            null,
          stripeSubscriptionId: chosenPersonal.stripeSubscriptionId ?? null,
        };
      }

      return {
        id: chosenPersonal.id,
        plan: chosenPersonal.plan,
        status: chosenPersonal.status,
        periodStart: chosenPersonal.periodStart ?? null,
        periodEnd: chosenPersonal.periodEnd ?? null,
        cancelAtPeriodEnd: chosenPersonal.cancelAtPeriodEnd ?? null,
        seats: (chosenPersonal as { seats?: number }).seats ?? null,
        stripeSubscriptionId: chosenPersonal.stripeSubscriptionId ?? null,
      };
    }

    // Fallback: query Stripe live if DB has no active/trialing personal sub
    const [user] = await db
      .select({ stripeCustomerId: UserTable.stripeCustomerId })
      .from(UserTable)
      .where(eq(UserTable.id, userId));
    if (user?.stripeCustomerId) {
      const list = await stripeClient.subscriptions.list({
        customer: user.stripeCustomerId,
        status: 'active',
        limit: 1,
        expand: ['data.items'],
      });
      const activeStripeSub = list.data.at(0) ?? null;
      if (activeStripeSub) {
        const activeItem = activeStripeSub.items.data.at(0) ?? null;
        const priceId = activeItem?.price?.id;
        let planName: string | null = null;
        if (isTeamPriceId(priceId)) {
          planName = 'voice gecko team';
        } else if (
          priceId === apiEnv().STRIPE_PRICE_ID_PRO_MONTHLY ||
          priceId === apiEnv().STRIPE_PRICE_ID_PRO_YEARLY
        ) {
          planName = 'voice gecko pro';
        }

        const activePeriods = computePeriodFromStripe(activeStripeSub);
        const computedPeriodStart = activePeriods.periodStart;
        const computedPeriodEnd = activePeriods.periodEnd;

        return {
          id: activeStripeSub.id,
          plan: planName,
          status: activeStripeSub.status,
          periodStart: computedPeriodStart,
          periodEnd: computedPeriodEnd,
          cancelAtPeriodEnd: activeStripeSub.cancel_at_period_end ?? null,
          seats: activeItem?.quantity ?? null,
          stripeSubscriptionId: activeStripeSub.id,
        };
      }
    }

    // Fallback to team-backed subscription if user is a team member
    const [member] = await db
      .select({ teamId: TeamMemberTable.teamId })
      .from(TeamMemberTable)
      .where(eq(TeamMemberTable.userId, userId));
    if (!member?.teamId) {
      return null;
    }

    const [team] = await db
      .select({ ownerUserId: TeamTable.ownerUserId })
      .from(TeamTable)
      .where(eq(TeamTable.id, member.teamId));
    if (!team?.ownerUserId) {
      return null;
    }

    const teamSubs = await db
      .select()
      .from(SubscriptionTable)
      .where(and(eq(SubscriptionTable.referenceId, team.ownerUserId)))
      .orderBy(
        desc(SubscriptionTable.status),
        desc(SubscriptionTable.periodStart)
      );

    const teamActive = teamSubs.find(
      (s) => s.status === 'active' && s.plan === 'voice gecko team'
    );
    const chosenTeam = teamActive ?? null;
    if (chosenTeam) {
      // If DB is missing period bounds, enrich from Stripe
      const hasTeamPeriodBounds = Boolean(
        chosenTeam.periodStart && chosenTeam.periodEnd
      );
      const hasTeamStripeId = Boolean(chosenTeam.stripeSubscriptionId);
      if (!hasTeamPeriodBounds && hasTeamStripeId) {
        const stripeSubTeam = await stripeClient.subscriptions.retrieve(
          chosenTeam.stripeSubscriptionId as string,
          { expand: ['items'] }
        );
        const teamPeriods = computePeriodFromStripe(stripeSubTeam);
        const computedPeriodStart = teamPeriods.periodStart;
        const computedPeriodEnd = teamPeriods.periodEnd;
        return {
          id: chosenTeam.id,
          plan: chosenTeam.plan,
          status: chosenTeam.status,
          periodStart: computedPeriodStart,
          periodEnd: computedPeriodEnd,
          cancelAtPeriodEnd: chosenTeam.cancelAtPeriodEnd ?? null,
          seats:
            stripeSubTeam.items?.data?.[0]?.quantity ??
            (chosenTeam as { seats?: number }).seats ??
            null,
          stripeSubscriptionId: chosenTeam.stripeSubscriptionId ?? null,
        };
      }

      return {
        id: chosenTeam.id,
        plan: chosenTeam.plan,
        status: chosenTeam.status,
        periodStart: chosenTeam.periodStart ?? null,
        periodEnd: chosenTeam.periodEnd ?? null,
        cancelAtPeriodEnd: chosenTeam.cancelAtPeriodEnd ?? null,
        seats: (chosenTeam as { seats?: number }).seats ?? null,
        stripeSubscriptionId: chosenTeam.stripeSubscriptionId ?? null,
      };
    }

    // Fallback for team: query Stripe for owner's active subs
    const [owner] = await db
      .select({ stripeCustomerId: UserTable.stripeCustomerId })
      .from(UserTable)
      .where(eq(UserTable.id, team.ownerUserId));
    if (!owner?.stripeCustomerId) {
      return null;
    }
    const ownerList = await stripeClient.subscriptions.list({
      customer: owner.stripeCustomerId,
      status: 'active',
      limit: 1,
      expand: ['data.items'],
    });
    const ownerActive = ownerList.data.at(0) ?? null;
    if (!ownerActive) {
      return null;
    }
    const ownerItem = ownerActive.items.data.at(0) ?? null;
    const oPriceId = ownerItem?.price?.id;
    let oPlanName: string | null = null;
    if (isTeamPriceId(oPriceId)) {
      oPlanName = 'voice gecko team';
    } else if (
      oPriceId === apiEnv().STRIPE_PRICE_ID_PRO_MONTHLY ||
      oPriceId === apiEnv().STRIPE_PRICE_ID_PRO_YEARLY
    ) {
      oPlanName = 'voice gecko pro';
    }
    const ownerPeriods = computePeriodFromStripe(ownerActive);
    const computedPeriodStart = ownerPeriods.periodStart;
    const computedPeriodEnd = ownerPeriods.periodEnd;
    return {
      id: ownerActive.id,
      plan: oPlanName,
      status: ownerActive.status,
      periodStart: computedPeriodStart,
      periodEnd: computedPeriodEnd,
      cancelAtPeriodEnd: ownerActive.cancel_at_period_end ?? null,
      seats: ownerItem?.quantity ?? null,
      stripeSubscriptionId: ownerActive.id,
    };
  },
};
