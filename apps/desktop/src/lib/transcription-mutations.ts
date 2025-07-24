import { queryClient, trpc, trpcClient } from "~/trpc";

export interface CreateTranscriptionInput {
  id: string;
  content: string;
  status: "normal" | "silent";
  durationSeconds?: number;
  modelUsed?: string;
  sampleRate?: number;
  appVersion?: string;
}

/**
 * Create a transcription using tRPC mutation outside of React components
 */
export async function createTranscription(input: CreateTranscriptionInput) {
  console.log("[TranscriptionMutations] 🎯 Starting transcription creation...");

  const result = await trpcClient.transcription.create.mutate(input);

  console.log("[TranscriptionMutations] ✅ Transcription created:", result);
  console.log("[TranscriptionMutations] 🔄 Starting cache invalidation...");

  // Debug: Log ALL queries in the cache to understand the structure
  const allQueries = queryClient.getQueryCache().getAll();
  console.log(
    "[TranscriptionMutations] 📋 ALL queries in cache:",
    allQueries.map((q) => ({
      queryKey: q.queryKey,
      state: q.state.status,
      dataUpdateCount: q.state.dataUpdateCount,
    })),
  );

  // Try multiple invalidation strategies
  console.log(
    "[TranscriptionMutations] 🧪 Testing multiple invalidation strategies...",
  );

  // Strategy 1: Invalidate by prefix
  await queryClient.invalidateQueries({
    queryKey: ["transcription"],
  });
  console.log(
    "[TranscriptionMutations] ✅ Strategy 1 complete: prefix invalidation",
  );

  // Strategy 2: Use tRPC's specific query key
  try {
    const tRPCQueryKey = trpc.transcription.getAll.queryKey();
    console.log("[TranscriptionMutations] 🔍 tRPC query key:", tRPCQueryKey);
    await queryClient.invalidateQueries({
      queryKey: tRPCQueryKey,
    });
    console.log(
      "[TranscriptionMutations] ✅ Strategy 2 complete: tRPC specific key",
    );
  } catch (error) {
    console.error("[TranscriptionMutations] ❌ Strategy 2 failed:", error);
  }

  // Strategy 3: Predicate-based invalidation
  await queryClient.invalidateQueries({
    predicate: (query) => {
      const isTranscriptionQuery =
        Array.isArray(query.queryKey) &&
        query.queryKey.length > 0 &&
        query.queryKey[0] === "transcription";
      if (isTranscriptionQuery) {
        console.log(
          "[TranscriptionMutations] 🎯 Found transcription query to invalidate:",
          query.queryKey,
        );
      }
      return isTranscriptionQuery;
    },
  });
  console.log(
    "[TranscriptionMutations] ✅ Strategy 3 complete: predicate-based",
  );

  // Strategy 4: Invalidate all queries (nuclear option for testing)
  await queryClient.invalidateQueries();
  console.log(
    "[TranscriptionMutations] ✅ Strategy 4 complete: invalidate ALL queries",
  );

  // Check what happened to the queries after invalidation
  const queriesAfter = queryClient.getQueryCache().getAll();
  const transcriptionQueriesAfter = queriesAfter.filter(
    (q) => Array.isArray(q.queryKey) && q.queryKey[0] === "transcription",
  );
  console.log(
    "[TranscriptionMutations] 📋 Transcription queries after invalidation:",
    transcriptionQueriesAfter.map((q) => ({
      queryKey: q.queryKey,
      state: q.state.status,
      dataUpdateCount: q.state.dataUpdateCount,
    })),
  );

  // Test: Try manual refetch to see if data is actually in database
  console.log("[TranscriptionMutations] 🔄 Testing manual refetch...");
  try {
    const freshData = await trpcClient.transcription.getAll.query({ limit: 5 });
    console.log(
      "[TranscriptionMutations] 📋 Fresh data from database:",
      freshData,
    );
  } catch (error) {
    console.error("[TranscriptionMutations] ❌ Manual refetch failed:", error);
  }

  console.log("[TranscriptionMutations] 🏁 Cache invalidation completed");
  return result;
}

/**
 * Delete a transcription using tRPC mutation outside of React components
 */
export async function deleteTranscription(id: number) {
  const result = await trpcClient.transcription.delete.mutate({ id });

  console.log(
    "[TranscriptionMutations] 🔄 Invalidating queries after transcription deletion...",
  );

  // Invalidate ALL transcription queries
  await queryClient.invalidateQueries({
    queryKey: ["transcription"],
  });

  console.log("[TranscriptionMutations] ✅ Cache invalidation completed");

  return result;
}
