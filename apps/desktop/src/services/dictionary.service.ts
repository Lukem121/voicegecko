import { log } from '@acme/observability/log';
import { queryClient, trpc } from '~/trpc';

export class DictionaryService {
  private static instance: DictionaryService | undefined;

  private constructor() {
    // Private constructor to prevent instantiation
  }

  static getInstance(): DictionaryService {
    DictionaryService.instance ??= new DictionaryService();
    return DictionaryService.instance;
  }

  /**
   * Get the dictionary prompt for dictation
   * Uses React Query cache if available, otherwise fetches from server
   */
  async getDictionaryPrompt(): Promise<string | null> {
    try {
      // Always fetch the latest data - this ensures we get updates after dictionary changes
      log.info('[DictionaryService] Fetching dictionary prompt');
      const prompt = await queryClient.fetchQuery(
        trpc.dictionary.getPrompt.queryOptions()
      );

      return prompt || null;
    } catch (error) {
      log.error(error, '[DictionaryService] Failed to get dictionary prompt:');
      // Don't fail dictation if dictionary fetch fails
      return null;
    }
  }

  /**
   * Prefetch the dictionary prompt to ensure it's in cache
   */
  async prefetchDictionaryPrompt(): Promise<void> {
    try {
      await queryClient.prefetchQuery(trpc.dictionary.getPrompt.queryOptions());
      log.info('[DictionaryService] Dictionary prompt prefetched');
    } catch (error) {
      log.error(
        error,
        '[DictionaryService] Failed to prefetch dictionary prompt:'
      );
    }
  }
}

export const dictionaryService = DictionaryService.getInstance();
