import { PgClassifiedError, PgErrorDetail } from '../types/pgError.js';

// ───── PG ERROR CODE → HTTP STATUS MAPPING ──────────────────────────────

type PgCodeMapping = {
  httpStatus: number;
  userMessage: string;
  retryable: boolean;
};

const PG_CODE_MAP: Record<string, PgCodeMapping> = {
  '23505': { httpStatus: 409, userMessage: 'Resource already exists', retryable: false },
  '23503': { httpStatus: 400, userMessage: 'Referenced resource not found', retryable: false },
  '23514': { httpStatus: 422, userMessage: 'Data validation failed', retryable: false },
  '40001': { httpStatus: 503, userMessage: 'Service temporarily unavailable', retryable: true },
  '40P01': { httpStatus: 503, userMessage: 'Service temporarily unavailable', retryable: true },
  '08006': { httpStatus: 503, userMessage: 'Service temporarily unavailable', retryable: false },
  '57014': { httpStatus: 503, userMessage: 'Request timed out', retryable: false },
  '53300': { httpStatus: 503, userMessage: 'Service temporarily unavailable', retryable: false },
};

const DEFAULT_MAPPING: PgCodeMapping = {
  httpStatus: 500,
  userMessage: 'An unexpected error occurred',
  retryable: false,
};

const PG_CODE_PATTERN = /^[0-9A-Z]{5}$/;

// ───── CLASSIFIER ──────────────────────────────

/**
 * Walk the `.cause` chain (up to 5 levels) to find an error with a `.code`
 * property matching a PostgreSQL SQLSTATE pattern. Returns the first matching
 * error, or the top-level error if no cause chain match is found.
 */
function findPgError(error: Error): Error & { code?: string } {
  let current: unknown = error;
  let depth = 0;
  while (current && depth < 5) {
    if (
      current instanceof Error &&
      'code' in current &&
      typeof (current as Error & { code?: string }).code === 'string' &&
      PG_CODE_PATTERN.test((current as Error & { code: string }).code)
    ) {
      return current as Error & { code: string };
    }
    current = (current as Error)?.cause;
    depth++;
  }
  return error as Error & { code?: string };
}

/**
 * Classify a PostgreSQL error into a structured HTTP response shape.
 * Extracts PG error metadata (constraint, table, schema, detail, column)
 * for server-side structured logging while providing a sanitized message
 * for the client.
 */
export function classifyPgError(error: Error): PgClassifiedError {
  const pgError = findPgError(error);
  const pgCode = pgError.code || 'UNKNOWN';
  const mapping = PG_CODE_MAP[pgCode] || DEFAULT_MAPPING;

  const pgDetail: PgErrorDetail = {
    constraint: (pgError as Error & { constraint?: string }).constraint ?? null,
    table: (pgError as Error & { table?: string }).table ?? null,
    schema: (pgError as Error & { schema?: string }).schema ?? null,
    detail: (pgError as Error & { detail?: string }).detail ?? null,
    column: (pgError as Error & { column?: string }).column ?? null,
  };

  return {
    httpStatus: mapping.httpStatus,
    userMessage: mapping.userMessage,
    pgCode,
    pgDetail,
    retryable: mapping.retryable,
  };
}
