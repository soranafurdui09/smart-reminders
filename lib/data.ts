import { createServerClient } from './supabase/server';
import { defaultLocale, normalizeLocale } from './i18n';

function logDataError(scope: string, error: unknown) {
  console.error(`[data] ${scope} failed`, error);
}

type HouseholdRecord = {
  id: string;
  name?: string;
  owner_user_id?: string;
  notify_all_if_unassigned?: boolean;
};

type HouseholdMembership = {
  role: string;
  households: HouseholdRecord | null;
};

type ReminderPreview = {
  id: string;
  title?: string;
  household_id?: string;
  schedule_type?: string;
  created_by?: string;
  is_active?: boolean;
};

type OccurrenceWithReminder = {
  id: string;
  occur_at: string;
  status: string;
  snoozed_until?: string | null;
  reminder?: ReminderPreview | null;
};

type DoneOccurrence = {
  id: string;
  occur_at?: string;
  status?: string;
  done_at?: string | null;
  reminder?: Pick<ReminderPreview, 'id' | 'title' | 'household_id'> | null;
};

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
  if (!data) {
    return null;
  }
  const household = Array.isArray(data.households)
    ? data.households[0] ?? null
    : data.households ?? null;
  return { ...data, households: household } as HouseholdMembership;
}

export async function getHouseholdMembers(householdId: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('household_members')
    .select('id, user_id, role, profiles(name, email)')
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

export async function getOpenOccurrencesForHousehold(householdId: string): Promise<OccurrenceWithReminder[]> {
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
  return (data ?? []).map((occurrence: any) => ({
    ...occurrence,
    reminder: Array.isArray(occurrence.reminder)
      ? occurrence.reminder[0] ?? null
      : occurrence.reminder ?? null
  }));
}

export async function getOpenOccurrencesForHouseholdRange(
  householdId: string,
  startIso: string,
  endIso: string
): Promise<OccurrenceWithReminder[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('reminder_occurrences')
    .select('id, occur_at, status, snoozed_until, reminder:reminders!inner(id, title, schedule_type, created_by, household_id, is_active)')
    .eq('reminders.household_id', householdId)
    .in('status', ['open', 'snoozed'])
    .gte('occur_at', startIso)
    .lte('occur_at', endIso)
    .order('occur_at');
  if (error) {
    logDataError('getOpenOccurrencesForHouseholdRange', error);
    return [];
  }
  return (data ?? []).map((occurrence: any) => ({
    ...occurrence,
    reminder: Array.isArray(occurrence.reminder)
      ? occurrence.reminder[0] ?? null
      : occurrence.reminder ?? null
  }));
}

export async function getDoneOccurrencesForHousehold(householdId: string, limit = 50): Promise<DoneOccurrence[]> {
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
  return (data ?? []).map((occurrence: any) => ({
    ...occurrence,
    reminder: Array.isArray(occurrence.reminder)
      ? occurrence.reminder[0] ?? null
      : occurrence.reminder ?? null
  }));
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
