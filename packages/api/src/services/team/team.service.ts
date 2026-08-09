import { sendTeamMemberAddedEmail } from '@acme/email/send/team-member-added';
import { stripeClient } from '@acme/payment/stripe';
import { TRPCError } from '@trpc/server';
import { apiEnv } from '../../../env';
import { teamRepository } from '../../repository/team.repository';
import { isTeamPriceId } from '../../utils/stripe-plan';

export class TeamService {
  async getOrCreateTeam(
    ownerUserId: string,
    ownerEmail: string | null | undefined
  ) {
    return await teamRepository.upsertTeam(ownerUserId, ownerEmail);
  }

  async listMembers(ownerUserId: string) {
    const teamId = ownerUserId;
    return await teamRepository.listMembers(teamId);
  }

  async getMemberContext(userId: string) {
    const membership = await teamRepository.findMembershipByUser(userId);
    if (!membership) {
      return { role: null, owner: null } as const;
    }
    if (membership.role === 'owner') {
      return { role: 'owner' as const, owner: null } as const;
    }
    const owner = await teamRepository.getTeamOwnerInfo(membership.teamId);
    return { role: 'member' as const, owner } as const;
  }

  async leaveTeam(userId: string) {
    const membership = await teamRepository.findMembershipByUser(userId);
    if (!membership) {
      return { success: true } as const;
    }
    if (membership.role === 'owner') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Owner cannot leave team',
      });
    }
    await teamRepository.deleteMembershipByUser(userId, membership.teamId);
    return { success: true } as const;
  }

  async getSeatStatus(ownerUserId: string) {
    // First, try to get seats; if total is zero but there's an active Stripe subscription,
    // backfill seats from Stripe immediately for fresh purchases.
    const status = await teamRepository.getSeatStatus(ownerUserId);

    if (status.total > 0) {
      return status;
    }

    const customerId =
      await teamRepository.findOwnerStripeCustomerId(ownerUserId);
    if (!customerId) {
      return status;
    }
    const active =
      await teamRepository.findActiveTeamSubscriptionByCustomer(customerId);
    if (!active?.stripeSubscriptionId) {
      // Fallback: DB has no active team sub yet. Query Stripe directly
      try {
        const list = await stripeClient.subscriptions.list({
          customer: customerId,
          status: 'active',
          limit: 5,
          expand: ['data.items'],
        });
        const activeStripe = list.data.find((s) => s.items?.data?.length);
        const item = activeStripe?.items?.data?.[0];
        const priceId = item?.price?.id;
        const isTeam = isTeamPriceId(priceId);
        const quantity = isTeam ? item?.quantity : undefined;
        if (typeof quantity === 'number' && quantity > 0) {
          if (activeStripe?.id) {
            await teamRepository.updateSeatsByStripeSubscriptionId(
              activeStripe.id,
              quantity
            );
          }
          const used = status.used;
          const total = quantity;
          const available = Math.max(total - used, 0);
          return { used, total, available } as const;
        }
      } catch {
        // ignore errors here; return original status
      }
      return status;
    }

    // Fetch live quantity from Stripe
    const stripe = stripeClient;
    try {
      const full = await stripe.subscriptions.retrieve(
        active.stripeSubscriptionId,
        { expand: ['items.data'] }
      );
      const quantity = full.items?.data?.[0]?.quantity;
      if (typeof quantity === 'number' && quantity > 0) {
        await teamRepository.updateSeatsByStripeSubscriptionId(
          active.stripeSubscriptionId,
          quantity
        );
        const used = status.used;
        const total = quantity;
        const available = Math.max(total - used, 0);
        return { used, total, available } as const;
      }
    } catch {
      // ignore errors here; return original status
      // fall through to return original status
    }
    return status;
  }

  async addMemberByEmail(
    ownerUserId: string,
    ownerName: string | null | undefined,
    email: string
  ) {
    const teamId = ownerUserId;

    // Validate seats
    const usedSeats = await teamRepository.countMembers(teamId);
    const stripeCustomerId =
      await teamRepository.findOwnerStripeCustomerId(ownerUserId);
    if (!stripeCustomerId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Team plan required to add members',
      });
    }
    const sub =
      await teamRepository.findActiveTeamSubscriptionByCustomer(
        stripeCustomerId
      );

    // Fallback: if DB hasn't recorded seats yet, read from Stripe live
    let totalSeats = sub?.seats ?? null;
    if (!sub || totalSeats == null || totalSeats < 1) {
      try {
        const list = await stripeClient.subscriptions.list({
          customer: stripeCustomerId,
          status: 'active',
          limit: 5,
          expand: ['data.items'],
        });
        const activeStripe = list.data.find((s) => s.items?.data?.length);
        const item = activeStripe?.items?.data?.[0];
        const priceId = item?.price?.id;
        const isTeam = isTeamPriceId(priceId);
        const quantity = isTeam ? item?.quantity : undefined;
        if (typeof quantity === 'number' && quantity > 0) {
          totalSeats = quantity;
          if (activeStripe?.id) {
            await teamRepository.updateSeatsByStripeSubscriptionId(
              activeStripe.id,
              quantity
            );
          }
        }
      } catch {
        // ignore and fall through
      }
    }

    if (totalSeats == null || totalSeats < 1) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Active Team subscription required',
      });
    }

    if (usedSeats >= totalSeats) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'No free seats. Increase seats in billing.',
      });
    }

    // Link to existing user if present
    const existingUser = await teamRepository.findExistingUserByEmail(email);
    const status = existingUser ? 'active' : 'invited';
    await teamRepository.insertMember(
      teamId,
      email,
      existingUser?.id ?? null,
      status
    );

    // Non-blocking email notification
    try {
      const ctaUrl = `${apiEnv().VOICEGECKO_APP_URL}/app/usage`;
      sendTeamMemberAddedEmail({
        to: email,
        ownerName: ownerName ?? null,
        teamName: null,
        ctaUrl,
      });
    } catch {
      // ignore email errors
    }

    return { success: true } as const;
  }

  async removeMember(ownerUserId: string, id: number) {
    const teamId = ownerUserId;
    const member = await teamRepository.findMemberUnderTeam(id, teamId);
    if (!member) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Member not found' });
    }
    if (member.role === 'owner') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot remove the team owner',
      });
    }
    return await teamRepository.deleteMember(id, teamId);
  }
}

export const teamService = new TeamService();
