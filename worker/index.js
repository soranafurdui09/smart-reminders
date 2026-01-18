import crypto from 'crypto';
import http from 'http';
import { setTimeout as sleep } from 'timers/promises';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

const REQUIRED_ENV = ['SUPABASE_SERVICE_ROLE_KEY'];
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
const POLL_INTERVAL_MS = Number(process.env.WORKER_POLL_MS || 5000);
const CLAIM_WINDOW_SECONDS = Number(process.env.WORKER_CLAIM_WINDOW_SECONDS || 5);
const GRACE_MINUTES = Number(process.env.WORKER_GRACE_MINUTES || 120);
const CLAIM_LIMIT = Number(process.env.WORKER_CLAIM_LIMIT || 500);
const MAX_CONCURRENCY = Number(process.env.WORKER_MAX_CONCURRENCY || 100);
const RECLAIM_MINUTES = Number(process.env.WORKER_RECLAIM_MINUTES || 5);
const METRICS_INTERVAL_MS = Number(process.env.WORKER_METRICS_INTERVAL_MS || 60000);
const HEALTH_PORT = Number(process.env.WORKER_HEALTH_PORT || 8787);

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || '';

const FREEBUSY_CACHE_TTL_MS = 10 * 60 * 1000;
const FREEBUSY_CACHE_WINDOW_MS = 24 * 60 * 60 * 1000;
const FREEBUSY_BUSY_BUFFER_MS = 2 * 60 * 1000;
const TOKEN_REFRESH_THRESHOLD_MS = 2 * 60 * 1000;

const RETRY_DELAYS_SECONDS = [30, 120, 600, 3600];

function ensureEnv() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (!SUPABASE_URL) {
    missing.push('SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL');
  }
  if (missing.length) {
    console.error('[worker] missing env vars', missing);
    process.exit(1);
  }
}

ensureEnv();

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const vapidConfigured = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && VAPID_SUBJECT);
if (vapidConfigured) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} else {
  console.warn('[worker] VAPID keys missing; push sends will be skipped');
}

function buildNotificationJobKey({ entityType, entityId, occurrenceAtUtc, channel }) {
  return `${entityType}:${entityId}:${occurrenceAtUtc}:${channel}`;
}

function normalizeBusyIntervals(raw) {
  const normalized = (Array.isArray(raw) ? raw : [])
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
    .filter(Boolean);
  normalized.sort((a, b) => a.startMs - b.startMs);
  return normalized.map(({ start, end }) => ({ start, end }));
}

function isCacheFresh(cache, windowStart, windowEnd, now, ttlMs = FREEBUSY_CACHE_TTL_MS) {
  const fetchedAtMs = new Date(cache.fetchedAt).getTime();
  if (Number.isNaN(fetchedAtMs)) return false;
  if (now.getTime() - fetchedAtMs > ttlMs) return false;
  const minMs = new Date(cache.timeMin).getTime();
  const maxMs = new Date(cache.timeMax).getTime();
  if (Number.isNaN(minMs) || Number.isNaN(maxMs)) return false;
  return minMs <= windowStart.getTime() && maxMs >= windowEnd.getTime();
}

function findBusyIntervalAt(busy, at) {
  const target = at.getTime();
  if (!busy?.length || Number.isNaN(target)) return null;
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

function computePostponeUntil(now, snoozeMinutes, busyInterval) {
  const base = new Date(now.getTime() + Math.max(1, snoozeMinutes) * 60 * 1000);
  if (!busyInterval) return base;
  const busyEndMs = new Date(busyInterval.end).getTime();
  if (Number.isNaN(busyEndMs)) return base;
  const bufferEnd = busyEndMs + FREEBUSY_BUSY_BUFFER_MS;
  return new Date(Math.max(base.getTime(), bufferEnd));
}

function parseContextSettings(raw, defaults) {
  const resolvedDefaults = defaults ?? {
    timeWindow: { enabled: false, startHour: 9, endHour: 20, daysOfWeek: [] },
    calendarBusy: { enabled: false, snoozeMinutes: 15 }
  };
  if (typeof raw !== 'object' || raw === null) {
    return resolvedDefaults;
  }
  const category = typeof raw.category === 'string' ? raw.category : null;
  const timeWindow = typeof raw.timeWindow === 'object' && raw.timeWindow ? raw.timeWindow : {};
  const calendarBusy = typeof raw.calendarBusy === 'object' && raw.calendarBusy ? raw.calendarBusy : {};
  const defaultTimeWindow = resolvedDefaults.timeWindow ?? {
    enabled: false,
    startHour: 9,
    endHour: 20,
    daysOfWeek: []
  };
  const defaultCalendarBusy = resolvedDefaults.calendarBusy ?? {
    enabled: false,
    snoozeMinutes: 15
  };
  const sanitizeHour = (value) => {
    const num = Number(value);
    if (Number.isNaN(num) || num < 0) return 0;
    if (num > 23) return 23;
    return Math.floor(num);
  };
  const sanitizeMinutes = (value) => {
    const num = Number(value);
    if (Number.isNaN(num) || num <= 0) return 15;
    if (num > 1440) return 1440;
    return Math.floor(num);
  };
  const sanitizeDay = (day) => {
    if (!day) return null;
    const normalized = String(day).toLowerCase();
    const allowed = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    return allowed.includes(normalized) ? normalized : null;
  };

  const parsedTimeWindow = {
    enabled: Boolean(timeWindow.enabled),
    startHour: sanitizeHour(timeWindow.startHour ?? defaultTimeWindow.startHour),
    endHour: sanitizeHour(timeWindow.endHour ?? defaultTimeWindow.endHour),
    daysOfWeek: Array.isArray(timeWindow.daysOfWeek)
      ? timeWindow.daysOfWeek.map(sanitizeDay).filter(Boolean)
      : []
  };
  const parsedCalendarBusy = {
    enabled: Boolean(calendarBusy.enabled),
    snoozeMinutes: sanitizeMinutes(calendarBusy.snoozeMinutes ?? defaultCalendarBusy.snoozeMinutes)
  };
  return {
    timeWindow: parsedTimeWindow,
    calendarBusy: parsedCalendarBusy,
    category
  };
}

function evaluateReminderContext({ now, settings, isCalendarBusy }) {
  const defaults = parseContextSettings(null);
  const timeWindow = settings.timeWindow ?? defaults.timeWindow;
  const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const day = dayMap[now.getDay()];
  if (timeWindow?.enabled) {
    const withinDay = !timeWindow.daysOfWeek.length || timeWindow.daysOfWeek.includes(day);
    if (!withinDay) {
      return { type: 'skip_for_now', reason: 'outside_day_window' };
    }
    const currentHour = now.getHours();
    if (currentHour < timeWindow.startHour || currentHour >= timeWindow.endHour) {
      return { type: 'skip_for_now', reason: 'outside_time_window' };
    }
  }
  const calendarSettings = settings.calendarBusy ?? defaults.calendarBusy;
  if (calendarSettings?.enabled && isCalendarBusy) {
    const snoozeMs = calendarSettings.snoozeMinutes * 60000;
    const newDate = new Date(now.getTime() + snoozeMs);
    return { type: 'auto_snooze', newScheduledAt: newDate.toISOString(), reason: 'calendar_busy' };
  }
  return { type: 'send_now' };
}

function resolveReminderTimeZone(reminderTz, userTz) {
  if (reminderTz && reminderTz !== 'UTC') {
    return reminderTz;
  }
  if (userTz) {
    return userTz;
  }
  return reminderTz || 'UTC';
}

function formatDateTime(value, timeZone) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  try {
    const formatter = new Intl.DateTimeFormat('ro-RO', {
      timeZone,
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    return formatter.format(date).replace(',', '');
  } catch {
    return date.toISOString();
  }
}

function toWallClockDate(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(date);
  const lookup = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      lookup[part.type] = part.value;
    }
  }
  const year = Number(lookup.year);
  const month = Number(lookup.month);
  const day = Number(lookup.day);
  const hour = Number(lookup.hour);
  const minute = Number(lookup.minute);
  return new Date(Date.UTC(year, month - 1, day, hour, minute));
}

async function refreshAccessToken(refreshToken) {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error('Missing Google OAuth env vars.');
  }
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('[worker] token refresh failed', payload);
    throw new Error('Token refresh failed');
  }
  const accessToken = String(payload.access_token || '');
  if (!accessToken) {
    throw new Error('Missing access token');
  }
  const expiresIn = Number(payload.expires_in || 0);
  return {
    accessToken,
    refreshToken: payload.refresh_token || refreshToken,
    expiresAt: new Date(Date.now() + Math.max(1, expiresIn) * 1000),
    scope: payload.scope
  };
}

async function ensureValidTokens(userId) {
  const { data, error } = await supabase
    .from('user_google_connections')
    .select('access_token, refresh_token, expires_at, scope')
    .eq('user_id', userId)
    .eq('provider', 'google_calendar')
    .maybeSingle();
  if (error || !data) {
    throw new Error('Missing google connection');
  }
  const expiresAt = new Date(data.expires_at);
  const now = new Date();
  if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() - now.getTime() > TOKEN_REFRESH_THRESHOLD_MS) {
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt,
      scope: data.scope
    };
  }
  const refreshed = await refreshAccessToken(data.refresh_token);
  await supabase
    .from('user_google_connections')
    .update({
      access_token: refreshed.accessToken,
      refresh_token: refreshed.refreshToken,
      expires_at: refreshed.expiresAt.toISOString(),
      scope: refreshed.scope ?? data.scope,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('provider', 'google_calendar');
  return refreshed;
}

async function fetchFreeBusy(accessToken, timeMin, timeMax, timeZone) {
  const response = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      timeZone,
      items: [{ id: 'primary' }]
    })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('[worker] freeBusy query failed', payload);
    throw new Error('Could not read freebusy');
  }
  const busy = payload?.calendars?.primary?.busy ?? [];
  return normalizeBusyIntervals(busy);
}

async function getFreeBusyIntervalsForUser({ userId, now, timeZone }) {
  const windowStart = now;
  const windowEnd = new Date(now.getTime() + FREEBUSY_CACHE_WINDOW_MS);
  const { data, error } = await supabase
    .from('user_google_connections')
    .select('freebusy_cache_json, freebusy_cache_time_min, freebusy_cache_time_max, freebusy_cache_fetched_at')
    .eq('user_id', userId)
    .eq('provider', 'google_calendar')
    .maybeSingle();
  if (!error && data?.freebusy_cache_time_min && data?.freebusy_cache_time_max && data?.freebusy_cache_fetched_at) {
    const cache = {
      busy: Array.isArray(data.freebusy_cache_json) ? data.freebusy_cache_json : [],
      timeMin: data.freebusy_cache_time_min,
      timeMax: data.freebusy_cache_time_max,
      fetchedAt: data.freebusy_cache_fetched_at
    };
    if (isCacheFresh(cache, windowStart, windowEnd, now)) {
      return normalizeBusyIntervals(cache.busy);
    }
  }

  const tokens = await ensureValidTokens(userId);
  const intervals = await fetchFreeBusy(tokens.accessToken, windowStart, windowEnd, timeZone);
  await supabase
    .from('user_google_connections')
    .update({
      freebusy_cache_json: intervals,
      freebusy_cache_time_min: windowStart.toISOString(),
      freebusy_cache_time_max: windowEnd.toISOString(),
      freebusy_cache_fetched_at: now.toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('provider', 'google_calendar');
  return intervals;
}

function shouldRetry(retryCount) {
  return retryCount < RETRY_DELAYS_SECONDS.length;
}

function getNextRetryAt(now, retryCount) {
  const index = Math.max(0, Math.min(retryCount - 1, RETRY_DELAYS_SECONDS.length - 1));
  return new Date(now.getTime() + RETRY_DELAYS_SECONDS[index] * 1000);
}

async function runWithConcurrency(items, limit, handler) {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(limit, queue.length) }).map(async () => {
    while (queue.length) {
      const item = queue.shift();
      if (!item) return;
      await handler(item);
    }
  });
  await Promise.all(workers);
}

async function getDbNow() {
  const { data, error } = await supabase.rpc('get_utc_now');
  if (error || !data) {
    throw new Error('get_utc_now failed');
  }
  return new Date(data);
}

async function reclaimStaleJobs(now) {
  const cutoff = new Date(now.getTime() - RECLAIM_MINUTES * 60 * 1000).toISOString();
  await supabase
    .from('notification_jobs')
    .update({
      status: 'pending',
      claimed_at: null,
      claim_token: null,
      updated_at: now.toISOString()
    })
    .eq('status', 'processing')
    .lt('claimed_at', cutoff);
}

async function claimJobs(windowStart, windowEnd, claimToken) {
  const { data, error } = await supabase.rpc('claim_notification_jobs', {
    p_window_start: windowStart.toISOString(),
    p_window_end: windowEnd.toISOString(),
    p_limit: CLAIM_LIMIT,
    p_claim_token: claimToken,
    p_channel: 'push'
  });
  if (error) {
    throw error;
  }
  return data ?? [];
}

async function ensureActionToken(job) {
  const nowMs = Date.now();
  const expiresAt = job.action_token_expires_at ? new Date(job.action_token_expires_at).getTime() : 0;
  if (job.action_token && expiresAt > nowMs) {
    return { token: job.action_token, expiresAt: job.action_token_expires_at };
  }
  const token = crypto.randomBytes(20).toString('hex');
  const nextExpires = new Date(nowMs + 7 * 24 * 60 * 60 * 1000).toISOString();
  await supabase
    .from('notification_jobs')
    .update({ action_token: token, action_token_expires_at: nextExpires, updated_at: new Date().toISOString() })
    .eq('id', job.id);
  return { token, expiresAt: nextExpires };
}

function isUniqueViolation(error) {
  return error?.code === '23505';
}

async function insertReminderLog({ occurrenceId, reminderId, occurrenceAtUtc, channel, nowIso }) {
  const { data, error } = await supabase
    .from('notification_log')
    .insert({
      reminder_occurrence_id: occurrenceId,
      reminder_id: reminderId,
      occurrence_at_utc: occurrenceAtUtc,
      channel,
      status: 'sent',
      sent_at: nowIso
    })
    .select('id')
    .single();
  if (isUniqueViolation(error)) {
    return { skip: true, id: null };
  }
  if (error) {
    return { skip: false, id: null, error };
  }
  return { skip: false, id: data?.id ?? null };
}

async function insertMedicationLog({ doseId, channel, nowIso }) {
  const { data, error } = await supabase
    .from('medication_notification_log')
    .insert({
      medication_dose_id: doseId,
      channel,
      status: 'sent',
      sent_at: nowIso
    })
    .select('id')
    .single();
  if (isUniqueViolation(error)) {
    return { skip: true, id: null };
  }
  if (error) {
    return { skip: false, id: null, error };
  }
  return { skip: false, id: data?.id ?? null };
}

async function markJobSent(jobId, nowIso) {
  await supabase
    .from('notification_jobs')
    .update({
      status: 'sent',
      last_error: null,
      delivered_at: nowIso,
      updated_at: nowIso
    })
    .eq('id', jobId);
}

async function markJobSkipped(jobId, nowIso, reason) {
  await supabase
    .from('notification_jobs')
    .update({
      status: 'skipped',
      last_error: reason ?? null,
      updated_at: nowIso
    })
    .eq('id', jobId);
}

async function markJobFailed(job, now, nowIso, errorMessage) {
  const currentRetry = job.retry_count ?? 0;
  const nextRetry = currentRetry + 1;
  if (shouldRetry(currentRetry)) {
    const nextRetryAt = getNextRetryAt(now, nextRetry).toISOString();
    await supabase
      .from('notification_jobs')
      .update({
        status: 'pending',
        retry_count: nextRetry,
        next_retry_at: nextRetryAt,
        last_error: errorMessage ?? null,
        claimed_at: null,
        claim_token: null,
        updated_at: nowIso
      })
      .eq('id', job.id);
    return;
  }
  await supabase
    .from('notification_jobs')
    .update({
      status: 'failed',
      retry_count: nextRetry,
      last_error: errorMessage ?? null,
      updated_at: nowIso
    })
    .eq('id', job.id);
}

async function rescheduleJob(jobId, notifyAt, nowIso) {
  await supabase
    .from('notification_jobs')
    .update({
      status: 'pending',
      notify_at: notifyAt.toISOString(),
      occurrence_at_utc: notifyAt.toISOString(),
      claimed_at: null,
      claim_token: null,
      updated_at: nowIso
    })
    .eq('id', jobId);
}

async function sendPushToSubscriptions(subs, payload) {
  if (!vapidConfigured) {
    return { status: 'skipped', staleEndpoints: [], error: 'vapid_missing' };
  }
  if (!subs.length) {
    return { status: 'skipped', staleEndpoints: [], error: 'no_subscriptions' };
  }
  const staleEndpoints = [];
  let failed = false;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth }
        },
        JSON.stringify(payload)
      );
    } catch (error) {
      const statusCode = error?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        staleEndpoints.push(sub.endpoint);
      } else {
        failed = true;
        console.error('[worker] push failed', error);
      }
    }
  }
  return { status: failed ? 'failed' : 'sent', staleEndpoints };
}

async function processBatch(now) {
  const nowIso = now.toISOString();
  const windowStart = new Date(now.getTime() - GRACE_MINUTES * 60 * 1000);
  const windowEnd = new Date(now.getTime() + CLAIM_WINDOW_SECONDS * 1000);
  await reclaimStaleJobs(now);
  const claimToken = crypto.randomBytes(16).toString('hex');
  const jobs = await claimJobs(windowStart, windowEnd, claimToken);
  if (!jobs.length) {
    return { claimed: 0, sent: 0, failed: 0, skipped: 0, maxLagSeconds: 0 };
  }

  const reminderIds = Array.from(new Set(jobs.map((job) => job.reminder_id)));
  const userIds = Array.from(new Set(jobs.map((job) => job.user_id)));

  const [{ data: reminders }, { data: profiles }, { data: subscriptions }, { data: occurrences }, { data: androidInstalls }] = await Promise.all([
    supabase.from('reminders').select('id, title, household_id, is_active, created_by, context_settings, kind, medication_details, tz').in('id', reminderIds),
    supabase.from('profiles').select('user_id, email, time_zone, context_defaults, notify_by_push').in('user_id', userIds),
    supabase.from('push_subscriptions').select('user_id, endpoint, p256dh, auth').in('user_id', userIds).eq('is_disabled', false),
    supabase.from('reminder_occurrences').select('id, reminder_id, occur_at, snoozed_until, status').in('reminder_id', reminderIds).in('status', ['open', 'snoozed']),
    supabase.from('device_installations').select('user_id, last_seen_at').in('user_id', userIds).eq('platform', 'android')
  ]);

  const reminderMap = new Map((reminders ?? []).map((reminder) => [reminder.id, reminder]));
  const profileMap = new Map((profiles ?? []).map((profile) => [
    profile.user_id,
    {
      email: profile.email,
      timeZone: profile.time_zone || 'UTC',
      contextDefaults: parseContextSettings(profile.context_defaults ?? null),
      notifyByPush: profile.notify_by_push ?? false
    }
  ]));

  const activeAndroidUsers = new Set();
  const activeAndroidCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  (androidInstalls ?? []).forEach((row) => {
    const lastSeen = new Date(row.last_seen_at || 0);
    if (!Number.isNaN(lastSeen.getTime()) && lastSeen >= activeAndroidCutoff) {
      activeAndroidUsers.add(row.user_id);
    }
  });

  const pushMap = new Map();
  (subscriptions ?? []).forEach((sub) => {
    const list = pushMap.get(sub.user_id) ?? [];
    list.push({ endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth });
    pushMap.set(sub.user_id, list);
  });

  const occurrenceMap = new Map();
  (occurrences ?? []).forEach((occurrence) => {
    const times = [occurrence.occur_at, occurrence.snoozed_until].filter(Boolean);
    times.forEach((time) => {
      occurrenceMap.set(`${occurrence.reminder_id}:${time}`, occurrence);
    });
  });

  const settingsMap = new Map();
  const calendarBusyUsers = new Set();
  (reminders ?? []).forEach((reminder) => {
    const profileDefaults = reminder.created_by ? profileMap.get(reminder.created_by)?.contextDefaults : null;
    const settings = parseContextSettings(reminder.context_settings ?? null, profileDefaults ?? undefined);
    settingsMap.set(reminder.id, settings);
    if (settings.calendarBusy?.enabled && reminder.created_by) {
      calendarBusyUsers.add(reminder.created_by);
    }
  });

  const busyIntervalMap = new Map();
  for (const userId of calendarBusyUsers) {
    try {
      const profile = profileMap.get(userId);
      const timeZone = profile?.timeZone || 'UTC';
      const intervals = await getFreeBusyIntervalsForUser({ userId, now, timeZone });
      busyIntervalMap.set(userId, findBusyIntervalAt(intervals, now));
    } catch (error) {
      console.error('[worker] freebusy check failed', error);
      busyIntervalMap.set(userId, null);
    }
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  let maxLagSeconds = 0;

  await runWithConcurrency(jobs, MAX_CONCURRENCY, async (job) => {
    if (job.status !== 'processing') return;
    const notifyAt = new Date(job.notify_at);
    const lagSeconds = Math.max(0, Math.round((now.getTime() - notifyAt.getTime()) / 1000));
    maxLagSeconds = Math.max(maxLagSeconds, lagSeconds);

    const reminder = reminderMap.get(job.reminder_id);
    if (!reminder?.household_id || reminder.is_active === false || !reminder.created_by) {
      await markJobFailed(job, now, nowIso, 'reminder_inactive');
      failed += 1;
      return;
    }

    const profile = profileMap.get(job.user_id);
    if (!profile?.notifyByPush) {
      await markJobSkipped(job.id, nowIso, 'pref_push_off');
      skipped += 1;
      return;
    }
    if (activeAndroidUsers.has(job.user_id)) {
      await markJobSkipped(job.id, nowIso, 'mobile_app_present');
      skipped += 1;
      return;
    }

    const settings = settingsMap.get(reminder.id) ?? parseContextSettings(reminder.context_settings ?? null);
    const busyInterval = settings.calendarBusy?.enabled
      ? busyIntervalMap.get(reminder.created_by) ?? null
      : null;
    const displayTimeZone = resolveReminderTimeZone(reminder.tz ?? null, profile.timeZone);
    const contextNow = displayTimeZone ? toWallClockDate(now, displayTimeZone) : now;
    const contextDueAt = displayTimeZone ? toWallClockDate(notifyAt, displayTimeZone) : notifyAt;
    const decision = evaluateReminderContext({
      now: contextNow,
      reminderDueAt: contextDueAt,
      settings,
      isCalendarBusy: Boolean(busyInterval)
    });

    if (decision.type === 'auto_snooze') {
      const snoozeMinutes = settings.calendarBusy?.snoozeMinutes ?? 15;
      const nextScheduledAt = computePostponeUntil(now, snoozeMinutes, busyInterval).toISOString();
      if (reminder.kind !== 'medication') {
        const occurrence = occurrenceMap.get(`${reminder.id}:${job.notify_at}`);
        if (occurrence) {
          await supabase
            .from('reminder_occurrences')
            .update({ snoozed_until: nextScheduledAt, status: 'snoozed' })
            .eq('id', occurrence.id);
        }
      }
      await rescheduleJob(job.id, new Date(nextScheduledAt), nowIso);
      return;
    }

    if (decision.type === 'skip_for_now') {
      const deferred = new Date(now.getTime() + 15 * 60 * 1000);
      await rescheduleJob(job.id, deferred, nowIso);
      return;
    }

    const subs = pushMap.get(job.user_id) ?? [];
    if (!subs.length) {
      await markJobSkipped(job.id, nowIso, 'missing_push');
      skipped += 1;
      return;
    }

    const occurrenceAtUtc = job.occurrence_at_utc ?? job.notify_at;
    const actionToken = await ensureActionToken(job);
    const title = reminder.kind === 'medication'
      ? `💊 ${(reminder.medication_details?.name ?? reminder.title)}`
      : reminder.title;
    const occurLabel = formatDateTime(notifyAt, displayTimeZone);
    const body = reminder.kind === 'medication'
      ? `Este timpul pentru medicament • ${occurLabel}`
      : `Scadenta: ${occurLabel}`;
    const url = reminder.kind === 'medication'
      ? `${APP_URL}/app`
      : `${APP_URL}/app/reminders/${reminder.id}`;

    let logId = null;
    let skip = false;
    if (reminder.kind === 'medication') {
      const doseId = job.entity_type === 'medication_dose' ? job.entity_id : null;
      if (!doseId) {
        await markJobFailed(job, now, nowIso, 'dose_missing');
        failed += 1;
        return;
      }
      const logResult = await insertMedicationLog({ doseId, channel: 'push', nowIso });
      skip = logResult.skip;
      logId = logResult.id;
      if (logResult.error) {
        await markJobFailed(job, now, nowIso, 'log_insert_failed');
        failed += 1;
        return;
      }
    } else {
      const occurrence = occurrenceMap.get(`${reminder.id}:${job.notify_at}`);
      if (!occurrence?.id) {
        await markJobFailed(job, now, nowIso, 'occurrence_missing');
        failed += 1;
        return;
      }
      const logResult = await insertReminderLog({
        occurrenceId: occurrence.id,
        reminderId: reminder.id,
        occurrenceAtUtc,
        channel: 'push',
        nowIso
      });
      skip = logResult.skip;
      logId = logResult.id;
      if (logResult.error) {
        await markJobFailed(job, now, nowIso, 'log_insert_failed');
        failed += 1;
        return;
      }
    }

    if (skip) {
      await markJobSkipped(job.id, nowIso, 'duplicate');
      skipped += 1;
      return;
    }

    const pushResult = await sendPushToSubscriptions(subs, {
      title,
      body,
      url,
      jobId: job.id,
      token: actionToken.token
    });

    if (pushResult.staleEndpoints.length) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('endpoint', pushResult.staleEndpoints);
    }

    if (pushResult.status === 'failed') {
      await markJobFailed(job, now, nowIso, pushResult.error ?? 'push_failed');
      failed += 1;
      return;
    }

    if (pushResult.status === 'skipped') {
      await markJobSkipped(job.id, nowIso, pushResult.error ?? 'push_skipped');
      skipped += 1;
      return;
    }

    if (logId && reminder.kind === 'medication') {
      await supabase
        .from('medication_notification_log')
        .update({ status: 'sent' })
        .eq('id', logId);
    }
    if (logId && reminder.kind !== 'medication') {
      await supabase
        .from('notification_log')
        .update({ status: 'sent' })
        .eq('id', logId);
    }

    await markJobSent(job.id, nowIso);
    sent += 1;
  });

  return { claimed: jobs.length, sent, failed, skipped, maxLagSeconds };
}

let lastMetricsAt = 0;

async function loop() {
  while (true) {
    const cycleStart = Date.now();
    try {
      const now = await getDbNow();
      const stats = await processBatch(now);
      const nowMs = Date.now();
      if (nowMs - lastMetricsAt > METRICS_INTERVAL_MS) {
        const { count } = await supabase
          .from('notification_jobs')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending')
          .eq('channel', 'push');
        console.log('[worker] metrics', {
          claimed: stats.claimed,
          sent: stats.sent,
          failed: stats.failed,
          skipped: stats.skipped,
          queueDepth: count ?? 0,
          maxLagSeconds: stats.maxLagSeconds
        });
        lastMetricsAt = nowMs;
      }
    } catch (error) {
      console.error('[worker] cycle failed', error);
    }
    const elapsed = Date.now() - cycleStart;
    await sleep(Math.max(0, POLL_INTERVAL_MS - elapsed));
  }
}

function startHealthServer() {
  const server = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, ts: new Date().toISOString() }));
      return;
    }
    res.writeHead(404);
    res.end();
  });
  server.listen(HEALTH_PORT, () => {
    console.log(`[worker] health endpoint listening on :${HEALTH_PORT}`);
  });
}

startHealthServer();
loop();
