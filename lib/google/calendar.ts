import { createServerClient } from '@/lib/supabase/server';
import { getGoogleCalendarRedirectUrl, getGoogleClientId, getGoogleClientSecret } from '@/lib/env';
import type { CalendarEventInput } from './types';

export interface GoogleTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope?: string;
}

export interface TimeBlockingOptions {
  userId: string;
  reminderId: string;
  durationMinutes?: number;
  workdayStartHour?: number;
  workdayEndHour?: number;
}

export interface TimeBlockingResult {
  eventId: string;
  start: string;
  end: string;
}

type BusySlot = { start: Date; end: Date };

const MS_PER_MINUTE = 60000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function clampToWorkHours(date: Date, startHour: number, endHour: number) {
  const normalized = new Date(date);
  const dayStart = new Date(normalized);
  dayStart.setHours(startHour, 0, 0, 0);
  const dayEnd = new Date(normalized);
  dayEnd.setHours(endHour, 0, 0, 0);
  if (normalized.getTime() < dayStart.getTime()) {
    return dayStart;
  }
  if (normalized.getTime() >= dayEnd.getTime()) {
    const nextDay = new Date(dayStart);
    nextDay.setDate(nextDay.getDate() + 1);
    return nextDay;
  }
  return normalized;
}

function normalizeBusySlots(raw: Array<{ start: string; end: string }>) {
  return raw
    .map((entry) => ({
      start: new Date(entry.start),
      end: new Date(entry.end)
    }))
    .filter((slot) => slot.end.getTime() > slot.start.getTime())
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

function findFreeSlot(
  busySlots: BusySlot[],
  windowStart: Date,
  windowEnd: Date,
  durationMs: number,
  workdayStartHour: number,
  workdayEndHour: number
): Date | null {
  if (windowEnd.getTime() <= windowStart.getTime()) {
    return null;
  }
  const dayCursor = new Date(windowStart);
  dayCursor.setHours(0, 0, 0, 0);
  while (dayCursor.getTime() <= windowEnd.getTime()) {
    const dayStart = new Date(dayCursor);
    dayStart.setHours(workdayStartHour, 0, 0, 0);
    const dayEnd = new Date(dayCursor);
    dayEnd.setHours(workdayEndHour, 0, 0, 0);
    const segmentStart = new Date(Math.max(dayStart.getTime(), windowStart.getTime()));
    const segmentEnd = new Date(Math.min(dayEnd.getTime(), windowEnd.getTime()));
    if (segmentEnd.getTime() > segmentStart.getTime()) {
      let cursor = new Date(segmentStart);
      const intervals = busySlots.filter(
        (slot) => slot.end.getTime() > segmentStart.getTime() && slot.start.getTime() < segmentEnd.getTime()
      );
      for (const interval of intervals) {
        const busyStart = new Date(Math.max(interval.start.getTime(), segmentStart.getTime()));
        const busyEnd = new Date(Math.min(interval.end.getTime(), segmentEnd.getTime()));
        if (busyStart.getTime() - cursor.getTime() >= durationMs) {
          return cursor;
        }
        if (busyEnd.getTime() > cursor.getTime()) {
          cursor = new Date(busyEnd);
        }
      }
      if (segmentEnd.getTime() - cursor.getTime() >= durationMs) {
        return cursor;
      }
    }
    dayCursor.setDate(dayCursor.getDate() + 1);
  }
  return null;
}

async function queryBusySlots(
  accessToken: string,
  timeMin: Date,
  timeMax: Date,
  timeZone: string
) {
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
    console.error('[google] freeBusy query failed', payload);
    throw new Error('Could not read calendar availability.');
  }
  const busy = payload?.calendars?.primary?.busy ?? [];
  return normalizeBusySlots(busy);
}
type GoogleConnectionRow = {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  scope: string | null;
};

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar';
const TOKEN_REFRESH_THRESHOLD_MS = 2 * 60 * 1000;

function encodeState(payload: { userId: string }) {
  return Buffer.from(JSON.stringify({ ...payload, ts: Date.now() }), 'utf8').toString('base64url');
}

export function decodeState(state: string | null) {
  if (!state) return null;
  try {
    const parsed = JSON.parse(Buffer.from(state, 'base64url').toString('utf8')) as { userId?: string };
    return parsed?.userId ? parsed.userId : null;
  } catch {
    return null;
  }
}

function buildOAuthParams(params: Record<string, string>) {
  const search = new URLSearchParams(params);
  return search.toString();
}

export async function getUserGoogleConnection(userId: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('user_google_connections')
    .select('access_token, refresh_token, expires_at, scope')
    .eq('user_id', userId)
    .eq('provider', 'google_calendar')
    .maybeSingle();
  if (error) {
    console.error('[google] load connection failed', error);
    return null;
  }
  return data as GoogleConnectionRow | null;
}

export async function upsertTokensForUser(userId: string, tokens: GoogleTokens & { scope?: string }) {
  const supabase = createServerClient();
  const { error } = await supabase
    .from('user_google_connections')
    .upsert(
      {
        user_id: userId,
        provider: 'google_calendar',
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_at: tokens.expiresAt.toISOString(),
        scope: tokens.scope ?? null,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'user_id,provider' }
    );
  if (error) {
    console.error('[google] upsert tokens failed', error);
    throw new Error('Could not store Google tokens.');
  }
}

export async function ensureValidTokens(userId: string): Promise<GoogleTokens> {
  const connection = await getUserGoogleConnection(userId);
  if (!connection) {
    throw new Error('Google Calendar not connected.');
  }

  const expiresAt = new Date(connection.expires_at);
  const now = Date.now();
  if (!Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() - TOKEN_REFRESH_THRESHOLD_MS > now) {
    return {
      accessToken: connection.access_token,
      refreshToken: connection.refresh_token,
      expiresAt,
      scope: connection.scope ?? undefined
    };
  }

  const refreshed = await refreshAccessToken(connection.refresh_token);
  const nextTokens = {
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken || connection.refresh_token,
    expiresAt: refreshed.expiresAt,
    scope: refreshed.scope ?? connection.scope ?? undefined
  };
  await upsertTokensForUser(userId, nextTokens);
  return nextTokens;
}

export async function getGoogleOAuthClient(userId: string): Promise<{ client: { accessToken: string }; tokens: GoogleTokens }> {
  const tokens = await ensureValidTokens(userId);
  return { client: { accessToken: tokens.accessToken }, tokens };
}

export function generateGoogleAuthUrl(userId: string) {
  const clientId = getGoogleClientId();
  const redirectUri = getGoogleCalendarRedirectUrl();
  const state = encodeState({ userId });
  const params = buildOAuthParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    scope: GOOGLE_CALENDAR_SCOPE,
    state
  });
  return `${GOOGLE_AUTH_URL}?${params}`;
}

export async function exchangeCodeForTokens(userId: string, code: string): Promise<void> {
  const clientId = getGoogleClientId();
  const clientSecret = getGoogleClientSecret();
  const redirectUri = getGoogleCalendarRedirectUrl();
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: buildOAuthParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('[google] token exchange failed', data);
    throw new Error('Token exchange failed.');
  }

  const accessToken = String(data.access_token || '');
  const refreshToken = String(data.refresh_token || '');
  const expiresIn = Number(data.expires_in || 0);
  const scope = typeof data.scope === 'string' ? data.scope : undefined;

  if (!accessToken) {
    throw new Error('Missing access token.');
  }

  let finalRefreshToken = refreshToken;
  if (!finalRefreshToken) {
    const existing = await getUserGoogleConnection(userId);
    finalRefreshToken = existing?.refresh_token || '';
  }
  if (!finalRefreshToken) {
    throw new Error('Missing refresh token.');
  }

  const expiresAt = new Date(Date.now() + Math.max(1, expiresIn) * 1000);
  await upsertTokensForUser(userId, {
    accessToken,
    refreshToken: finalRefreshToken,
    expiresAt,
    scope
  });
}

export async function createOrUpdateCalendarEventForReminder(options: {
  userId: string;
  reminderId: string;
}): Promise<{ eventId: string }> {
  const supabase = createServerClient();
  const { data: reminder, error } = await supabase
    .from('reminders')
    .select('id, title, notes, due_at, pre_reminder_minutes')
    .eq('id', options.reminderId)
    .maybeSingle();
  if (error || !reminder) {
    console.error('[google] reminder fetch failed', error);
    throw new Error('Reminder not found.');
  }
  if (!reminder.due_at) {
    throw new Error('Reminder has no due date.');
  }

  const { client } = await getGoogleOAuthClient(options.userId);
  const startDate = new Date(reminder.due_at);
  const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);

  const event: CalendarEventInput = {
    summary: reminder.title,
    description: reminder.notes || undefined,
    start: { dateTime: startDate.toISOString() },
    end: { dateTime: endDate.toISOString() }
  };

  if (reminder.pre_reminder_minutes && reminder.pre_reminder_minutes > 0) {
    event.reminders = {
      useDefault: false,
      overrides: [{ method: 'popup', minutes: reminder.pre_reminder_minutes }]
    };
  }

  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${client.accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(event)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('[google] calendar event create failed', payload);
    throw new Error('Calendar event creation failed.');
  }

  return { eventId: String(payload.id || '') };
}

export async function autoBlockTimeForReminder(options: TimeBlockingOptions): Promise<TimeBlockingResult> {
  const durationMinutes = options.durationMinutes ?? 30;
  const workdayStartHour = options.workdayStartHour ?? 9;
  const workdayEndHour = options.workdayEndHour ?? 20;
  if (workdayEndHour <= workdayStartHour) {
    throw new Error('Invalid working hours.');
  }
  const durationMs = durationMinutes * MS_PER_MINUTE;

  const supabase = createServerClient();
  const { data: reminder, error } = await supabase
    .from('reminders')
    .select('id, title, notes, due_at, tz')
    .eq('id', options.reminderId)
    .maybeSingle();
  if (error) {
    console.error('[google] reminder lookup failed', error);
    throw new Error('Could not load reminder.');
  }
  if (!reminder) {
    throw new Error('Reminder not found.');
  }
  if (!reminder.due_at) {
    throw new Error('Reminder must have a due date for auto-blocking.');
  }
  const timeZone = reminder.tz || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const now = new Date();
  let searchStart = clampToWorkHours(now, workdayStartHour, workdayEndHour);
  const deadline = new Date(reminder.due_at);
  const primaryEnd = new Date(deadline);
  const fallbackStart = clampToWorkHours(
    new Date(Math.max(primaryEnd.getTime(), searchStart.getTime())),
    workdayStartHour,
    workdayEndHour
  );
  const fallbackEnd = new Date(Math.max(primaryEnd.getTime(), fallbackStart.getTime()) + 7 * MS_PER_DAY);
  const busySlots = await queryBusySlots(
    (await ensureValidTokens(options.userId)).accessToken,
    searchStart,
    fallbackEnd,
    timeZone
  );
  const targetStart = findFreeSlot(
    busySlots,
    searchStart,
    primaryEnd,
    durationMs,
    workdayStartHour,
    workdayEndHour
  );
  const finalStart =
    targetStart ??
    findFreeSlot(busySlots, fallbackStart, fallbackEnd, durationMs, workdayStartHour, workdayEndHour);
  if (!finalStart) {
    throw new Error('No free time slot available in the next 7 days.');
  }
  const finalEnd = new Date(finalStart.getTime() + durationMs);
  const { client } = await getGoogleOAuthClient(options.userId);
  const event: CalendarEventInput = {
    summary: reminder.title,
    description: reminder.notes
      ? `${reminder.notes}\n\nAutomatically scheduled via Reminder inteligent.`
      : 'Automatically scheduled via Reminder inteligent.',
    start: { dateTime: finalStart.toISOString(), timeZone },
    end: { dateTime: finalEnd.toISOString(), timeZone }
  };

  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${client.accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(event)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('[google] auto-block event failed', payload);
    throw new Error('Could not create calendar event.');
  }
  await supabase
    .from('reminders')
    .update({
      google_event_id: String(payload.id || null),
      google_calendar_id: 'primary'
    })
    .eq('id', reminder.id);
  return {
    eventId: String(payload.id || ''),
    start: finalStart.toISOString(),
    end: finalEnd.toISOString()
  };
}

export async function deleteCalendarEventForReminder(options: {
  userId: string;
  reminderId: string;
}): Promise<void> {
  const supabase = createServerClient();
  const { data: reminder, error } = await supabase
    .from('reminders')
    .select('id, google_event_id, google_calendar_id')
    .eq('id', options.reminderId)
    .maybeSingle();
  if (error) {
    console.error('[google] reminder lookup failed', error);
    throw new Error('Could not load reminder.');
  }
  if (!reminder || !reminder.google_event_id) {
    return;
  }
  const calendarId = reminder.google_calendar_id || 'primary';
  const { client } = await getGoogleOAuthClient(options.userId);
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
    calendarId
  )}/events/${encodeURIComponent(reminder.google_event_id)}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${client.accessToken}`
    }
  });
  if (!response.ok && response.status !== 404) {
    const payload = await response.json().catch(() => ({}));
    console.error('[google] delete event failed', payload);
    throw new Error('Could not delete calendar event.');
  }
  await supabase
    .from('reminders')
    .update({ google_event_id: null, google_calendar_id: 'primary' })
    .eq('id', options.reminderId);
}

async function refreshAccessToken(refreshToken: string) {
  const clientId = getGoogleClientId();
  const clientSecret = getGoogleClientSecret();
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: buildOAuthParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('[google] refresh failed', data);
    throw new Error('Token refresh failed.');
  }

  const accessToken = String(data.access_token || '');
  if (!accessToken) {
    throw new Error('Missing access token after refresh.');
  }
  const expiresIn = Number(data.expires_in || 0);
  const scope = typeof data.scope === 'string' ? data.scope : undefined;
  return {
    accessToken,
    refreshToken,
    expiresAt: new Date(Date.now() + Math.max(1, expiresIn) * 1000),
    scope
  };
}

export async function isUserBusyInCalendarAt(options: {
  userId: string;
  at: Date;
}): Promise<boolean> {
  try {
    const tokens = await ensureValidTokens(options.userId);
    const windowMs = 5 * 60000;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const timeMin = new Date(options.at.getTime() - windowMs);
    const timeMax = new Date(options.at.getTime() + windowMs);
    const busySlots = await queryBusySlots(tokens.accessToken, timeMin, timeMax, timeZone);
    return busySlots.some(
      (slot) => slot.start.getTime() <= options.at.getTime() && options.at.getTime() < slot.end.getTime()
    );
  } catch (error) {
    console.error('[google] is user busy failed', error);
    return false;
  }
}
