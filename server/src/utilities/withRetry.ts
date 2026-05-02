import { classifyPgError } from './pgError.js';

// ───── RETRY WRAPPER ──────────────────────────────

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 100;

/**
 * Wrap an async operation with exponential backoff retry for transient
 * PostgreSQL errors (deadlock_detected, serialization_failure). The
 * provided `fn` closure MUST create a new PoolClient and transaction on
 * each invocation — retries re-acquire the entire transaction from BEGIN.
 *
 * Accepts an optional AbortSignal to abort mid-backoff during graceful shutdown.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: { signal?: AbortSignal; maxAttempts?: number },
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? MAX_ATTEMPTS;
  const signal = options?.signal;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const classified = classifyPgError(lastError);

      if (!classified.retryable || attempt >= maxAttempts) {
        console.error(
          JSON.stringify({
            level: 'error',
            message: classified.retryable ? 'Retry exhaustion' : 'Non-retryable PG error',
            pgCode: classified.pgCode,
            totalAttempts: attempt,
            retryable: classified.retryable,
          }),
        );
        throw lastError;
      }

      const delayMs = BASE_DELAY_MS * Math.pow(2, attempt - 1);

      console.warn(
        JSON.stringify({
          level: 'warn',
          message: 'Retry attempt',
          pgCode: classified.pgCode,
          attemptNumber: attempt,
          delayMs,
        }),
      );

      if (signal?.aborted) {
        throw new Error('Service shutting down', { cause: error });
      }

      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, delayMs);
        if (signal) {
          const onAbort = () => {
            clearTimeout(timer);
            reject(new Error('Service shutting down', { cause: error }));
          };
          signal.addEventListener('abort', onAbort, { once: true });
        }
      }).catch((err) => {
        throw new Error('Service shutting down', { cause: err });
      });
    }
  }

  throw lastError;
}
