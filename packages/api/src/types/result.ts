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
  DUPLICATE_WORD: 'DUPLICATE_WORD',
  WORD_NOT_FOUND: 'WORD_NOT_FOUND',
  LIMIT_EXCEEDED: 'LIMIT_EXCEEDED',
  INVALID_WORD: 'INVALID_WORD',
  DATABASE_ERROR: 'DATABASE_ERROR',
} as const;

// Feedback-specific error codes
export const FeedbackErrorCodes = {
  FEEDBACK_TOO_LONG: 'FEEDBACK_TOO_LONG',
  FEEDBACK_EMPTY: 'FEEDBACK_EMPTY',
  TRANSCRIPTION_NOT_FOUND: 'TRANSCRIPTION_NOT_FOUND',
  DISCORD_SEND_FAILED: 'DISCORD_SEND_FAILED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

// Helper functions for creating results
export const success = <T>(data: T): Result<T> => ({ success: true, data });

export const error = <T>(appError: AppError): Result<T> => ({
  success: false,
  error: appError,
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
    message: 'Dictionary entry not found',
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

// Helper functions for creating specific feedback errors
export const feedbackError = {
  feedbackTooLong: (maxLength: number, actualLength: number): AppError => ({
    code: FeedbackErrorCodes.FEEDBACK_TOO_LONG,
    message: `Feedback is too long. Maximum ${maxLength} characters allowed, but got ${actualLength}.`,
    details: { maxLength, actualLength },
  }),

  feedbackEmpty: (): AppError => ({
    code: FeedbackErrorCodes.FEEDBACK_EMPTY,
    message: 'Feedback cannot be empty. Please provide some text.',
    details: {},
  }),

  transcriptionNotFound: (transcriptionId: number): AppError => ({
    code: FeedbackErrorCodes.TRANSCRIPTION_NOT_FOUND,
    message:
      "The transcription you're trying to provide feedback for was not found.",
    details: { transcriptionId },
  }),

  discordSendFailed: (originalError: string): AppError => ({
    code: FeedbackErrorCodes.DISCORD_SEND_FAILED,
    message: 'Failed to send feedback to our team. Please try again later.',
    details: { originalError },
  }),

  internalError: (message: string): AppError => ({
    code: FeedbackErrorCodes.INTERNAL_ERROR,
    message: `An internal error occurred: ${message}`,
    details: { originalMessage: message },
  }),
};
