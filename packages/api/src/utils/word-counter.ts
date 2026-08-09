const WORD_SPLIT_PATTERN = /\s+/;

/**
 * Count words in a text string using simple whitespace splitting
 * @param text The text to count words in
 * @returns The number of words
 */
export function countWords(text: string): number {
  if (!text || typeof text !== 'string') {
    return 0;
  }

  // Trim and split by any whitespace (spaces, tabs, newlines, etc.)
  const words = text.trim().split(WORD_SPLIT_PATTERN);

  // Filter out empty strings (in case of multiple spaces)
  const validWords = words.filter((word) => word.length > 0);

  return validWords.length;
}
