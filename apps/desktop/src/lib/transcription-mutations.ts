import { log } from '@acme/observability';
import { queryClient, trpc, trpcClient } from '~/trpc';

export interface CreateTranscriptionInput {
  content: string;
  status: 'normal' | 'silent';
  durationSeconds?: number;
  modelUsed?: string;
  sampleRate?: number;
  appVersion?: string;
}

/**
 * Create a transcription using tRPC mutation outside of React components
 */
export async function createTranscription(input: CreateTranscriptionInput) {
  log.info('[TranscriptionMutations] 🎯 Starting transcription creation...');

  const result = await trpcClient.transcription.create.mutate(input);

  log.info('[TranscriptionMutations] ✅ Transcription created:', result);
  log.info('[TranscriptionMutations] 🔄 Starting cache invalidation...');

  // Debug: Log ALL queries in the cache to understand the structure
  const allQueries = queryClient.getQueryCache().getAll();
  log.info(
    '[TranscriptionMutations] 📋 ALL queries in cache:',
    allQueries.map((q) => ({
      queryKey: q.queryKey,
      state: q.state.status,
      dataUpdateCount: q.state.dataUpdateCount,
    }))
  );

  // Try multiple invalidation strategies
  log.info(
    '[TranscriptionMutations] 🧪 Testing multiple invalidation strategies...'
  );

  // Strategy 1: Invalidate by prefix
  await queryClient.invalidateQueries({
    queryKey: ['transcription'],
  });
  log.info(
    '[TranscriptionMutations] ✅ Strategy 1 complete: prefix invalidation'
  );

  // Strategy 2: Use tRPC's specific query key
  try {
    const tRPCQueryKey = trpc.transcription.getAll.queryKey();
    log.info('[TranscriptionMutations] 🔍 tRPC query key:', tRPCQueryKey);
    await queryClient.invalidateQueries({
      queryKey: tRPCQueryKey,
    });
    log.info(
      '[TranscriptionMutations] ✅ Strategy 2 complete: tRPC specific key'
    );
  } catch (error) {
    log.error('[TranscriptionMutations] ❌ Strategy 2 failed:', error);
  }

  // Strategy 3: Predicate-based invalidation
  await queryClient.invalidateQueries({
    predicate: (query) => {
      const isTranscriptionQuery =
        Array.isArray(query.queryKey) &&
        query.queryKey.length > 0 &&
        query.queryKey[0] === 'transcription';
      if (isTranscriptionQuery) {
        log.info(
          '[TranscriptionMutations] 🎯 Found transcription query to invalidate:',
          query.queryKey
        );
      }
      return isTranscriptionQuery;
    },
  });
  log.info('[TranscriptionMutations] ✅ Strategy 3 complete: predicate-based');

  // Strategy 4: Invalidate all queries (nuclear option for testing)
  await queryClient.invalidateQueries();
  log.info(
    '[TranscriptionMutations] ✅ Strategy 4 complete: invalidate ALL queries'
  );

  // Specifically invalidate usage queries to ensure UI updates
  await queryClient.invalidateQueries({
    queryKey: ['usage'],
  });
  log.info('[TranscriptionMutations] ✅ Usage queries invalidated');

  // Check what happened to the queries after invalidation
  const queriesAfter = queryClient.getQueryCache().getAll();
  const transcriptionQueriesAfter = queriesAfter.filter(
    (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'transcription'
  );
  log.info(
    '[TranscriptionMutations] 📋 Transcription queries after invalidation:',
    transcriptionQueriesAfter.map((q) => ({
      queryKey: q.queryKey,
      state: q.state.status,
      dataUpdateCount: q.state.dataUpdateCount,
    }))
  );

  // Test: Try manual refetch to see if data is actually in database
  log.info('[TranscriptionMutations] 🔄 Testing manual refetch...');
  try {
    const freshData = await trpcClient.transcription.getAll.query({ limit: 5 });
    log.info(
      '[TranscriptionMutations] 📋 Fresh data from database:',
      freshData
    );
  } catch (error) {
    log.error('[TranscriptionMutations] ❌ Manual refetch failed:', error);
  }

  log.info('[TranscriptionMutations] 🏁 Cache invalidation completed');
  return result;
}

/**
 * Delete a transcription using tRPC mutation outside of React components
 */
export async function deleteTranscription(id: number) {
  const result = await trpcClient.transcription.delete.mutate({ id });

  log.info(
    '[TranscriptionMutations] 🔄 Invalidating queries after transcription deletion...'
  );

  // Invalidate ALL transcription queries
  await queryClient.invalidateQueries({
    queryKey: ['transcription'],
  });

  log.info('[TranscriptionMutations] ✅ Cache invalidation completed');

  return result;
}
