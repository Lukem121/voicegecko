import { log } from '@acme/observability/log';
import { queryClient, trpc, trpcClient } from '~/trpc';

export type CreateDictationInput = {
  content: string;
  status: 'normal' | 'silent';
  durationSeconds?: number;
  modelUsed?: string;
  sampleRate?: number;
  appVersion?: string;
};

/**
 * Create a dictation using tRPC mutation outside of React components
 */
export async function createDictation(input: CreateDictationInput) {
  log.info('[DictationMutations] 🎯 Starting dictation creation...');

  const result = await trpcClient.dictation.create.mutate(input);

  log.info('[DictationMutations] ✅ Dictation created:', result);
  log.info('[DictationMutations] 🔄 Starting cache invalidation...');

  // Debug: Log ALL queries in the cache to understand the structure
  const allQueries = queryClient.getQueryCache().getAll();
  log.info(
    '[DictationMutations] 📋 ALL queries in cache:',
    allQueries.map((q) => ({
      queryKey: q.queryKey,
      state: q.state.status,
      dataUpdateCount: q.state.dataUpdateCount,
    }))
  );

  // Try multiple invalidation strategies
  log.info(
    '[DictationMutations] 🧪 Testing multiple invalidation strategies...'
  );

  // Strategy 1: Invalidate by prefix
  await queryClient.invalidateQueries({
    queryKey: ['dictation'],
  });
  log.info('[DictationMutations] ✅ Strategy 1 complete: prefix invalidation');

  // Strategy 2: Use tRPC's specific query key
  try {
    const tRPCQueryKey = trpc.dictation.getAll.queryKey();
    log.info('[DictationMutations] 🔍 tRPC query key:', tRPCQueryKey);
    await queryClient.invalidateQueries({
      queryKey: tRPCQueryKey,
    });
    log.info('[DictationMutations] ✅ Strategy 2 complete: tRPC specific key');
  } catch (error) {
    log.error(error, '[DictationMutations] ❌ Strategy 2 failed:');
  }

  // Strategy 3: Predicate-based invalidation
  await queryClient.invalidateQueries({
    predicate: (query) => {
      const isDictationQuery =
        Array.isArray(query.queryKey) &&
        query.queryKey.length > 0 &&
        query.queryKey[0] === 'dictation';
      if (isDictationQuery) {
        log.info(
          '[DictationMutations] 🎯 Found dictation query to invalidate:',
          query.queryKey
        );
      }
      return isDictationQuery;
    },
  });
  log.info('[DictationMutations] ✅ Strategy 3 complete: predicate-based');

  // Strategy 4: Invalidate all queries (nuclear option for testing)
  await queryClient.invalidateQueries();
  log.info(
    '[DictationMutations] ✅ Strategy 4 complete: invalidate ALL queries'
  );

  // Specifically invalidate usage queries to ensure UI updates
  await queryClient.invalidateQueries({
    queryKey: ['usage'],
  });
  log.info('[DictationMutations] ✅ Usage queries invalidated');

  // Check what happened to the queries after invalidation
  const queriesAfter = queryClient.getQueryCache().getAll();
  const dictationQueriesAfter = queriesAfter.filter(
    (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'dictation'
  );
  log.info(
    '[DictationMutations] 📋 Dictation queries after invalidation:',
    dictationQueriesAfter.map((q) => ({
      queryKey: q.queryKey,
      state: q.state.status,
      dataUpdateCount: q.state.dataUpdateCount,
    }))
  );

  // Test: Try manual refetch to see if data is actually in database
  log.info('[DictationMutations] 🔄 Testing manual refetch...');
  try {
    const freshData = await trpcClient.dictation.getAll.query({ limit: 5 });
    log.info('[DictationMutations] 📋 Fresh data from database:', freshData);
  } catch (error) {
    log.error(error, '[DictationMutations] ❌ Manual refetch failed:');
  }

  log.info('[DictationMutations] 🏁 Cache invalidation completed');
  return result;
}

/**
 * Delete a dictation using tRPC mutation outside of React components
 */
export async function deleteDictation(id: number) {
  const result = await trpcClient.dictation.delete.mutate({ id });

  log.info(
    '[DictationMutations] 🔄 Invalidating queries after dictation deletion...'
  );

  // Invalidate ALL dictation queries
  await queryClient.invalidateQueries({
    queryKey: ['dictation'],
  });

  log.info('[DictationMutations] ✅ Cache invalidation completed');

  return result;
}
