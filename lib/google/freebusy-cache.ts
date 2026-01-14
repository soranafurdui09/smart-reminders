export type FreeBusyInterval = {
  start: string;
  end: string;
};

export type FreeBusyCacheState = {
  busy: FreeBusyInterval[];
  timeMin: string;
  timeMax: string;
  fetchedAt: string;
};

export const FREEBUSY_CACHE_TTL_MS = 10 * 60 * 1000;
export const FREEBUSY_CACHE_WINDOW_MS = 24 * 60 * 60 * 1000;
export const FREEBUSY_BUSY_BUFFER_MS = 2 * 60 * 1000;

export function normalizeBusyIntervals(raw: FreeBusyInterval[]) {
  const normalized = raw
    .map((entry) => {
      const startMs = new Date(entry.start).getTime();
      const endMs = new Date(entry.end).getTime();
      if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) {
        return null;
      }
      return {
        start: new Date(startMs).toISOString(),
        end: new Date(endMs).toISOString(),
        startMs
      };
    })
    .filter(Boolean) as Array<{ start: string; end: string; startMs: number }>;
  normalized.sort((a, b) => a.startMs - b.startMs);
  return normalized.map(({ start, end }) => ({ start, end }));
}

export function isCacheFresh(
  cache: FreeBusyCacheState,
  windowStart: Date,
  windowEnd: Date,
  now: Date,
  ttlMs: number = FREEBUSY_CACHE_TTL_MS
) {
  const fetchedAtMs = new Date(cache.fetchedAt).getTime();
  if (Number.isNaN(fetchedAtMs)) {
    return false;
  }
  if (now.getTime() - fetchedAtMs > ttlMs) {
    return false;
  }
  const minMs = new Date(cache.timeMin).getTime();
  const maxMs = new Date(cache.timeMax).getTime();
  if (Number.isNaN(minMs) || Number.isNaN(maxMs)) {
    return false;
  }
  return minMs <= windowStart.getTime() && maxMs >= windowEnd.getTime();
}

export function findBusyIntervalAt(busy: FreeBusyInterval[], at: Date) {
  const target = at.getTime();
  if (!busy.length || Number.isNaN(target)) {
    return null;
  }
  let left = 0;
  let right = busy.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const startMs = new Date(busy[mid].start).getTime();
    const endMs = new Date(busy[mid].end).getTime();
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
      return null;
    }
    if (target < startMs) {
      right = mid - 1;
      continue;
    }
    if (target >= endMs) {
      left = mid + 1;
      continue;
    }
    return busy[mid];
  }
  return null;
}

export function computePostponeUntil(
  now: Date,
  snoozeMinutes: number,
  busyInterval?: FreeBusyInterval | null
) {
  const base = new Date(now.getTime() + Math.max(1, snoozeMinutes) * 60 * 1000);
  if (!busyInterval) {
    return base;
  }
  const busyEndMs = new Date(busyInterval.end).getTime();
  if (Number.isNaN(busyEndMs)) {
    return base;
  }
  const bufferEnd = busyEndMs + FREEBUSY_BUSY_BUFFER_MS;
  return new Date(Math.max(base.getTime(), bufferEnd));
}
