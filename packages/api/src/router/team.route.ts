import type { TRPCRouterRecord } from '@trpc/server';
import { z } from 'zod/v4';
import { teamService } from '../services/team/team.service';
import { protectedProcedure } from '../trpc';

export const teamRouter = {
  getOrCreate: protectedProcedure.mutation(async ({ ctx }) => {
    return await teamService.getOrCreateTeam(
      ctx.session.user.id,
      ctx.session.user.email
    );
  }),

  getMembers: protectedProcedure.query(async ({ ctx }) => {
    await teamService.getOrCreateTeam(
      ctx.session.user.id,
      ctx.session.user.email
    );
    return await teamService.listMembers(ctx.session.user.id);
  }),

  getSeatStatus: protectedProcedure.query(async ({ ctx }) => {
    await teamService.getOrCreateTeam(
      ctx.session.user.id,
      ctx.session.user.email
    );
    return await teamService.getSeatStatus(ctx.session.user.id);
  }),

  getMemberContext: protectedProcedure.query(async ({ ctx }) => {
    return await teamService.getMemberContext(ctx.session.user.id);
  }),

  leave: protectedProcedure.mutation(async ({ ctx }) => {
    return await teamService.leaveTeam(ctx.session.user.id);
  }),

  addMemberByEmail: protectedProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      await teamService.getOrCreateTeam(
        ctx.session.user.id,
        ctx.session.user.email
      );
      return await teamService.addMemberByEmail(
        ctx.session.user.id,
        ctx.session.user.name,
        input.email
      );
    }),

  removeMember: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      return await teamService.removeMember(ctx.session.user.id, input.id);
    }),
} satisfies TRPCRouterRecord;
