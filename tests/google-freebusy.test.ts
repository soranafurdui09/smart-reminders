import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchFreeBusy } from '../lib/google/calendar';

test('fetchFreeBusy parses busy intervals from Google response', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => ({
    ok: true,
    json: async () => ({
      calendars: {
        primary: {
          busy: [
            { start: '2026-01-10T09:00:00.000Z', end: '2026-01-10T10:00:00.000Z' }
          ]
        }
      }
    })
  })) as typeof fetch;

  try {
    const busy = await fetchFreeBusy(
      'test-token',
      new Date('2026-01-10T00:00:00.000Z'),
      new Date('2026-01-11T00:00:00.000Z'),
      'UTC'
    );
    assert.equal(busy.length, 1);
    assert.equal(busy[0].start.toISOString(), '2026-01-10T09:00:00.000Z');
    assert.equal(busy[0].end.toISOString(), '2026-01-10T10:00:00.000Z');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
