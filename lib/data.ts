import { createServerClient } from './supabase/server';
import { defaultLocale, normalizeLocale } from './i18n';

function logDataError(scope: string, error: unknown) {
  console.error(`[data] ${scope} failed`, error);
}

export async function getUserHousehold(userId: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('household_members')
    .select('role, households(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    logDataError('getUserHousehold', error);
    return null;
  }
  return data;
}

export async function getHouseholdMembers(householdId: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('household_members')
    .select('user_id, role, profiles(name, email)')
    .eq('household_id', householdId)
    .order('created_at');
  if (error) {
    logDataError('getHouseholdMembers', error);
    return [];
  }
  return data ?? [];
}

export async function getHouseholdInvites(householdId: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('household_invites')
    .select('id, email, role, expires_at, accepted_at, created_at')
    .eq('household_id', householdId)
    .order('created_at', { ascending: false });
  if (error) {
    logDataError('getHouseholdInvites', error);
    return [];
  }
  return data ?? [];
}

export async function getOpenOccurrencesForHousehold(householdId: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('reminder_occurrences')
    .select('id, occur_at, status, snoozed_until, reminder:reminders!inner(id, title, schedule_type, created_by, household_id, is_active)')
    .eq('reminders.household_id', householdId)
    .in('status', ['open', 'snoozed'])
    .order('occur_at');
  if (error) {
    logDataError('getOpenOccurrencesForHousehold', error);
    return [];
  }
  return data ?? [];
}

export async function getDoneOccurrencesForHousehold(householdId: string, limit = 50) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('reminder_occurrences')
    .select('id, occur_at, status, done_at, reminder:reminders!inner(id, title, household_id)')
    .eq('reminders.household_id', householdId)
    .eq('status', 'done')
    .order('done_at', { ascending: false })
    .limit(limit);
  if (error) {
    logDataError('getDoneOccurrencesForHousehold', error);
    return [];
  }
  return data ?? [];
}

export async function getUserLocale(userId: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('locale')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    logDataError('getUserLocale', error);
    return defaultLocale;
  }
  return normalizeLocale(data?.locale);
}

export async function getReminderById(reminderId: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('reminders')
    .select('id, title, notes, schedule_type, due_at, is_active, reminder_occurrences(id, occur_at, status)')
    .eq('id', reminderId)
    .order('occur_at', { foreignTable: 'reminder_occurrences' })
    .maybeSingle();
  if (error) {
    logDataError('getReminderById', error);
    return null;
  }
  return data;
}
