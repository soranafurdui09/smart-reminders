import { addMinutes } from 'date-fns';

export const DEFAULT_RETRY_BACKOFF_MINUTES = [1, 5, 15, 60, 180] as const;
export const DEFAULT_MAX_RETRIES = 5;

export function shouldRetry(retryCount: number, maxRetries = DEFAULT_MAX_RETRIES) {
  return retryCount < maxRetries;
}

export function getRetryDelayMinutes(
  retryCount: number,
  backoffs: readonly number[] = DEFAULT_RETRY_BACKOFF_MINUTES
) {
  if (retryCount <= 0) return backoffs[0];
  const index = Math.min(retryCount - 1, backoffs.length - 1);
  return backoffs[index];
}

export function getNextRetryAt(now: Date, retryCount: number) {
  const minutes = getRetryDelayMinutes(retryCount);
  return addMinutes(now, minutes);
}
