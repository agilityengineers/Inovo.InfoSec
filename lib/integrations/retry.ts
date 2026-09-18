import 'server-only';

/**
 * Retries a fan-out call with exponential backoff.
 *
 * Integrations are best-effort from the visitor's point of view — the report is
 * already on their screen — but a lost lead is a lost deal, so each target gets
 * a few attempts before the failure is recorded for the admin's log.
 */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  {
    attempts = 3,
    baseMs = 500,
    onAttemptFailed,
  }: { attempts?: number; baseMs?: number; onAttemptFailed?: (attempt: number, error: unknown) => void } = {},
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      onAttemptFailed?.(attempt, error);
      if (attempt < attempts) {
        await new Promise((r) => setTimeout(r, baseMs * 2 ** (attempt - 1)));
      }
    }
  }
  throw lastError;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
