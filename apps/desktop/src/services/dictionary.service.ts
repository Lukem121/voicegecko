import { log } from '@acme/observability/log';
import { invoke } from '@tauri-apps/api/core';
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
   * Local-first dictionary prompt: SQLite → in-memory cache → optional tRPC sync.
   */
  async getDictionaryPrompt(): Promise<string | null> {
    try {
      const local = await invoke<string | null>('get_local_dictionary_prompt');
      if (local?.trim()) {
        await invoke('set_dictionary_prompt_cache', { prompt: local }).catch(
          () => undefined
        );
        return local;
      }
    } catch (error) {
      log.warn(error, '[DictionaryService] Local dictionary read failed');
    }

    try {
      log.info('[DictionaryService] Fetching dictionary prompt from API');
      const prompt = await queryClient.fetchQuery(
        trpc.dictionary.getPrompt.queryOptions()
      );

      const value = prompt?.trim() || null;
      if (value) {
        await invoke('set_dictionary_prompt_cache', { prompt: value }).catch(
          () => undefined
        );
        const words = value.split(/[,;\n]+/).map((w) => w.trim()).filter(Boolean);
        if (words.length > 0) {
          await invoke('sync_local_dictionary_words', { words }).catch(
            () => undefined
          );
        }
      }
      return value;
    } catch (error) {
      log.warn(error, '[DictionaryService] API dictionary fetch failed');
      return null;
    }
  }

  async prefetchDictionaryPrompt(): Promise<void> {
    await this.getDictionaryPrompt();
  }
}

export const dictionaryService = DictionaryService.getInstance();
