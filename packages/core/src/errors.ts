/**
 * Typed error taxonomy shared across layers. Keeps failure handling explicit and lets the UI map
 * error codes to user-facing, localized messages without string-matching.
 */

export const ERROR_CODES = [
  'recorder/permission-denied',
  'recorder/session-activation-failed',
  'recorder/capture-failed',
  'recorder/interrupted',
  'upload/failed',
  'transcription/failed',
  'transcription/unsupported-language',
  'llm/failed',
  'llm/invalid-json',
  'llm/missing-key',
  'quota/recording-limit',
  'quota/daily-limit',
  'auth/failed',
  'network/offline',
  'unknown',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export interface AiRecapErrorOptions {
  code: ErrorCode;
  message: string;
  /** Whether the caller may retry the same operation. */
  retryable?: boolean;
  cause?: unknown;
}

export class AiRecapError extends Error {
  readonly code: ErrorCode;
  readonly retryable: boolean;

  constructor(options: AiRecapErrorOptions) {
    super(options.message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'AiRecapError';
    this.code = options.code;
    this.retryable = options.retryable ?? false;
  }
}

export function isAiRecapError(value: unknown): value is AiRecapError {
  return value instanceof AiRecapError;
}
