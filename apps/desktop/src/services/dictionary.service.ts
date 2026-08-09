import { log } from '@acme/observability/log';
import { invoke } from '@tauri-apps/api/core';

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
   * Local-only dictionary prompt from on-device SQLite.
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
      await invoke('set_dictionary_prompt_cache', { prompt: null }).catch(
        () => undefined
      );
      return null;
    } catch (error) {
      log.warn(error, '[DictionaryService] Local dictionary read failed');
      return null;
    }
  }

  async prefetchDictionaryPrompt(): Promise<void> {
    await this.getDictionaryPrompt();
  }

  async refreshPromptCache(): Promise<void> {
    await this.getDictionaryPrompt();
  }
}

export const dictionaryService = DictionaryService.getInstance();
