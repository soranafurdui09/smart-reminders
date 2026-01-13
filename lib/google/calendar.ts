import { createServerClient } from '@/lib/supabase/server';
import { getGoogleCalendarRedirectUrl, getGoogleClientId, getGoogleClientSecret } from '@/lib/env';
import type { CalendarEventInput } from './types';

export interface GoogleTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope?: string;
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
