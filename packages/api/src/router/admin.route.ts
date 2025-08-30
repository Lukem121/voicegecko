import { eq } from '@acme/db';
import { db } from '@acme/db/client';
import { session as SessionTable } from '@acme/db/schema';
import type { TRPCRouterRecord } from '@trpc/server';
import { z } from 'zod/v4';
import { adminService } from '../services/admin/admin.service';
import { adminProcedure } from '../trpc';

// Utility: recent activity window in days for "most active" sorting/fallback
const DEFAULT_ACTIVITY_WINDOW_DAYS = 30;

export const adminRouter = {
  users: {
    list: adminProcedure
      .input(
        z.object({
          search: z.string().optional(),
          limit: z.number().min(1).max(100).default(50),
          cursor: z.string().optional(), // userId cursor for pagination
          activityWindowDays: z
            .number()
            .min(1)
            .max(120)
            .default(DEFAULT_ACTIVITY_WINDOW_DAYS),
        })
      )
      .query(async ({ input }) => {
        const params = input ?? { limit: 50 };
        return await adminService.getUsersList(params);
      }),

    byId: adminProcedure
      .input(z.object({ userId: z.string() }))
      .query(async ({ input }) => {
        const { userId } = input;
        const user = await adminService.getUserById(userId);
        return { user };
      }),

    updateProfile: adminProcedure
      .input(
        z.object({
          userId: z.string(),
          name: z.string().optional(),
          displayUsername: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { userId, ...data } = input;
        await adminService.updateUserProfile(userId, data);
        return { success: true };
      }),
  },

  sessions: {
    listByUser: adminProcedure
      .input(z.object({ userId: z.string() }))
      .query(async ({ input }) => {
        const { userId } = input;

        const sessions = await db.query.session.findMany({
          columns: {
            id: true,
            ipAddress: true,
            userAgent: true,
            createdAt: true,
          },
          where: (table, { eq: _eq }) => _eq(table.userId, userId),
          orderBy: (table, { desc: _desc }) => _desc(table.createdAt),
        });

        return { sessions };
      }),

    revoke: adminProcedure
      .input(z.object({ sessionId: z.string() }))
      .mutation(async ({ input }) => {
        const { sessionId } = input;

        await db.delete(SessionTable).where(eq(SessionTable.id, sessionId));

        return { success: true };
      }),

    revokeAll: adminProcedure
      .input(z.object({ userId: z.string() }))
      .mutation(async ({ input }) => {
        const { userId } = input;

        await db.delete(SessionTable).where(eq(SessionTable.userId, userId));

        return { success: true };
      }),
  },

  dictations: {
    listByUser: adminProcedure
      .input(
        z.object({
          userId: z.string(),
          cursor: z.number().optional(),
          limit: z.number().min(1).max(100).default(20),
          search: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        const { userId, ...params } = input;
        const result = await adminService.getUserDictations(userId, params);

        const hasNextPage = result.dictations.length > params.limit;
        const dictations = hasNextPage
          ? result.dictations.slice(0, params.limit)
          : result.dictations;
        const nextCursor =
          hasNextPage && dictations.length > 0
            ? dictations.at(-1)?.id
            : undefined;

        return {
          dictations,
          hasNextPage,
          nextCursor,
          totalResults: result.totalResults,
        };
      }),

    delete: adminProcedure
      .input(z.object({ dictationId: z.number(), userId: z.string() }))
      .mutation(async ({ input }) => {
        const { dictationId, userId } = input;
        await adminService.deleteDictation(dictationId, userId);
        return { success: true };
      }),

    listAll: adminProcedure
      .input(
        z.object({
          cursor: z.number().optional(),
          limit: z.number().min(1).max(100).default(20),
          search: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        return await adminService.getAllDictations(input);
      }),
  },

  dictionary: {
    listByUser: adminProcedure
      .input(z.object({ userId: z.string() }))
      .query(async ({ input }) => {
        const { userId } = input;
        const entries = await adminService.getUserDictionary(userId);
        return { entries };
      }),

    add: adminProcedure
      .input(z.object({ userId: z.string(), word: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const { userId, word } = input;
        const entry = await adminService.addDictionaryEntry(userId, word);
        return { entry };
      }),

    delete: adminProcedure
      .input(z.object({ entryId: z.number(), userId: z.string() }))
      .mutation(async ({ input }) => {
        const { entryId, userId } = input;
        const entry = await adminService.deleteDictionaryEntry(entryId, userId);
        return { entry };
      }),
  },

  billing: {
    getLatestSubscription: adminProcedure
      .input(z.object({ userId: z.string() }))
      .query(async ({ input }) => {
        const { userId } = input;
        const subscription = await adminService.getUserSubscription(userId);

        if (!subscription) {
          return { subscription: null };
        }

        return { subscription };
      }),

    restoreSubscription: adminProcedure
      .input(z.object({ userId: z.string() }))
      .mutation(async ({ input }) => {
        const { userId } = input;
        await adminService.restoreSubscription(userId);
        return { success: true };
      }),
  },

  stats: {
    getDaily: adminProcedure
      .input(z.object({ days: z.number().min(1).max(90).default(14) }))
      .query(async ({ input }) => {
        const { days } = input;
        const stats = await adminService.getDailyStats(days);
        return { stats };
      }),
  },
} satisfies TRPCRouterRecord;
