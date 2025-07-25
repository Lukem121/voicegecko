// Result pattern for robust error handling
export type Result<T, E = AppError> =
  | { success: true; data: T }
  | { success: false; error: E };

// Standardized error types
export interface AppError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Dictionary-specific error codes
export const DictionaryErrorCodes = {
  DUPLICATE_WORD: "DUPLICATE_WORD",
  WORD_NOT_FOUND: "WORD_NOT_FOUND",
  LIMIT_EXCEEDED: "LIMIT_EXCEEDED",
  INVALID_WORD: "INVALID_WORD",
  DATABASE_ERROR: "DATABASE_ERROR",
} as const;

// Helper functions for creating results
export const success = <T>(data: T): Result<T> => ({ success: true, data });

export const error = <T>(error: AppError): Result<T> => ({
  success: false,
  error,
});

// Helper functions for creating specific dictionary errors
export const dictionaryError = {
  duplicateWord: (word: string): AppError => ({
    code: DictionaryErrorCodes.DUPLICATE_WORD,
    message: `The word "${word}" already exists in your dictionary`,
    details: { word },
  }),

  wordNotFound: (id: number): AppError => ({
    code: DictionaryErrorCodes.WORD_NOT_FOUND,
    message: "Dictionary entry not found",
    details: { id },
  }),

  limitExceeded: (limit: number): AppError => ({
    code: DictionaryErrorCodes.LIMIT_EXCEEDED,
    message: `You can only have up to ${limit} dictionary entries`,
    details: { limit },
  }),

  invalidWord: (reason: string): AppError => ({
    code: DictionaryErrorCodes.INVALID_WORD,
    message: `Invalid word: ${reason}`,
    details: { reason },
  }),

  databaseError: (message: string): AppError => ({
    code: DictionaryErrorCodes.DATABASE_ERROR,
    message: `Database error: ${message}`,
    details: { originalMessage: message },
  }),
};
