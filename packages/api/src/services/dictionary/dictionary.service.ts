import { dictionaryRepository } from '../../repository/dictionary.repository';

export const dictionaryService = {
  async getUserDictionaryPrompt(userId: string): Promise<string> {
    const entries = await dictionaryRepository.getAllByUser(userId, {
      sortBy: 'alphabetical',
    });

    if (entries.length === 0) {
      return '';
    }

    const words = entries.map((entry) => entry.word);

    return this.optimizePromptForTokenLimit(words);
  },

  /**
   * Simply repeat each word 3 times for better recognition without triggering repetition detection
   */
  optimizePromptForTokenLimit(words: string[]): string {
    if (words.length === 0) return '';

    const repeatedWords: string[] = [];

    words.forEach((word) => {
      repeatedWords.push(word, word, word);
    });

    return repeatedWords.join(', ');
  },
};
