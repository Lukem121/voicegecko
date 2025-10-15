import { and, desc, eq, or } from '@acme/db';
import { db } from '@acme/db/client';
import {
  subscription as SubscriptionTable,
  TeamMemberTable,
  TeamTable,
  user as UserTable,
} from '@acme/db/schema';
import { stripeClient } from '@acme/payment/stripe';
import { apiEnv } from '../../env';

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
        const item = activeStripeSub.items.data.at(0) ?? null;
        const priceId = item?.price?.id;
        let planName: string | null = null;
        if (
          priceId === apiEnv().STRIPE_PRICE_ID_TEAM_MONTHLY ||
          priceId === apiEnv().STRIPE_PRICE_ID_TEAM_YEARLY
        ) {
          planName = 'voice gecko team';
        } else if (
          priceId === apiEnv().STRIPE_PRICE_ID_PRO_MONTHLY ||
          priceId === apiEnv().STRIPE_PRICE_ID_PRO_YEARLY
        ) {
          planName = 'voice gecko pro';
        }
        return {
          id: activeStripeSub.id,
          plan: planName,
          status: activeStripeSub.status,
          periodStart: new Date(activeStripeSub.current_period_start * 1000),
          periodEnd: new Date(activeStripeSub.current_period_end * 1000),
          cancelAtPeriodEnd: activeStripeSub.cancel_at_period_end ?? null,
          seats: item?.quantity ?? null,
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
    const oItem = ownerActive.items.data.at(0) ?? null;
    const oPriceId = oItem?.price?.id;
    let oPlanName: string | null = null;
    if (
      oPriceId === apiEnv().STRIPE_PRICE_ID_TEAM_MONTHLY ||
      oPriceId === apiEnv().STRIPE_PRICE_ID_TEAM_YEARLY
    ) {
      oPlanName = 'voice gecko team';
    } else if (
      oPriceId === apiEnv().STRIPE_PRICE_ID_PRO_MONTHLY ||
      oPriceId === apiEnv().STRIPE_PRICE_ID_PRO_YEARLY
    ) {
      oPlanName = 'voice gecko pro';
    }
    return {
      id: ownerActive.id,
      plan: oPlanName,
      status: ownerActive.status,
      periodStart: new Date(ownerActive.current_period_start * 1000),
      periodEnd: new Date(ownerActive.current_period_end * 1000),
      cancelAtPeriodEnd: ownerActive.cancel_at_period_end ?? null,
      seats: oItem?.quantity ?? null,
      stripeSubscriptionId: ownerActive.id,
    };
  },
};
