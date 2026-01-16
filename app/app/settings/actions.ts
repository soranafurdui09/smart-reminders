'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { normalizeLocale } from '@/lib/i18n';
import { getDefaultContextSettings, type DayOfWeek } from '@/lib/reminders/context';

const DAYS: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
];

function normalizeHour(value: FormDataEntryValue | null, fallback: number) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(23, Math.max(0, Math.floor(num)));
}

function normalizeMinutes(value: FormDataEntryValue | null, fallback: number) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return Math.min(1440, Math.floor(num));
}

function buildContextDefaults(formData: FormData) {
  const defaults = getDefaultContextSettings();
  const timeWindowEnabled = String(formData.get('context_time_window_enabled') || '') === '1';
  const startHour = normalizeHour(formData.get('context_time_start_hour'), defaults.timeWindow?.startHour ?? 9);
  const endHour = normalizeHour(formData.get('context_time_end_hour'), defaults.timeWindow?.endHour ?? 20);
  const daysOfWeek = formData
    .getAll('context_time_days')
    .map((day) => String(day))
    .filter((day): day is DayOfWeek => DAYS.includes(day as DayOfWeek));
  const calendarEnabled = String(formData.get('context_calendar_busy_enabled') || '') === '1';
  const snoozeMinutes = normalizeMinutes(
    formData.get('context_calendar_snooze_minutes'),
    defaults.calendarBusy?.snoozeMinutes ?? 15
  );

  return {
    timeWindow: {
      enabled: timeWindowEnabled,
      startHour,
      endHour,
      daysOfWeek
    },
    calendarBusy: {
      enabled: calendarEnabled,
      snoozeMinutes
    }
  };
}

export async function updateLocale(formData: FormData) {
  const user = await requireUser('/app/settings');
  const locale = normalizeLocale(String(formData.get('locale') || ''));

  const supabase = createServerClient();
  await supabase.from('profiles').update({ locale }).eq('user_id', user.id);

  const cookieStore = cookies();
  cookieStore.set('locale', locale, { path: '/', maxAge: 60 * 60 * 24 * 365 });

  redirect('/app/settings?updated=1');
}

export async function updateContextDefaults(formData: FormData) {
  const user = await requireUser('/app/settings');
  const contextDefaults = buildContextDefaults(formData);

  const supabase = createServerClient();
  await supabase
    .from('profiles')
    .update({ context_defaults: contextDefaults })
    .eq('user_id', user.id);

  redirect('/app/settings?context=1');
}

export async function updateNotificationPreferences(formData: FormData) {
  const user = await requireUser('/app/settings');
  const notifyByEmail = String(formData.get('notify_by_email') || '') === '1';
  const notifyByPush = String(formData.get('notify_by_push') || '') === '1';

  const supabase = createServerClient();
  await supabase
    .from('profiles')
    .update({ notify_by_email: notifyByEmail, notify_by_push: notifyByPush })
    .eq('user_id', user.id);

  redirect('/app/settings?notifications=1');
}
