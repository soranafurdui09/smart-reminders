import { addDays, addHours, isAfter, startOfDay } from 'date-fns';
import { createServerClient } from '@/lib/supabase/server';

export type MedicationFrequencyType = 'once_per_day' | 'times_per_day' | 'every_n_hours';

export type MedicationDetails = {
  name: string;
  dose?: string | null;
  personId: string | null;
  frequencyType: MedicationFrequencyType;
  timesPerDay?: number;
  everyNHours?: number;
  timesOfDay?: string[];
  startDate: string;
  endDate: string | null;
  addToCalendar?: boolean;
};

const DEFAULT_PRESETS = ['08:00', '12:00', '18:00', '22:00'];
const MAX_HORIZON_DAYS = 90;

function parseTime(value: string) {
  const [hours, minutes] = value.split(':').map((part) => Number(part));
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return { hours: Math.min(23, Math.max(0, Math.floor(hours))), minutes: Math.min(59, Math.max(0, Math.floor(minutes))) };
}

function buildDateTime(dateStr: string, timeStr: string) {
  const parsed = parseTime(timeStr);
  if (!parsed) return null;
  const date = new Date(`${dateStr}T00:00:00Z`);
  date.setUTCHours(parsed.hours, parsed.minutes, 0, 0);
  return date;
}

function normalizeTimes(details: MedicationDetails): string[] {
  const times = Array.isArray(details.timesOfDay) ? details.timesOfDay.filter(Boolean) : [];
  if (details.frequencyType === 'once_per_day') {
    return times.length ? [times[0]] : [DEFAULT_PRESETS[0]];
  }
  if (details.frequencyType === 'times_per_day') {
    const count = Math.min(4, Math.max(1, Number(details.timesPerDay || times.length || 1)));
    if (times.length >= count) {
      return times.slice(0, count);
    }
    const fallback = DEFAULT_PRESETS.slice(0, count);
    return fallback;
  }
  if (details.frequencyType === 'every_n_hours') {
    return times.length ? [times[0]] : [DEFAULT_PRESETS[0]];
  }
  return times;
}

export function getMedicationDoseTimes(details: MedicationDetails, horizonDays = MAX_HORIZON_DAYS) {
  const timesOfDay = normalizeTimes(details);
  const startValue = new Date(`${details.startDate}T00:00:00Z`);
  if (Number.isNaN(startValue.getTime())) {
    return [];
  }
  const startDate = startOfDay(startValue);
  const endDate = details.endDate
    ? startOfDay(new Date(`${details.endDate}T00:00:00Z`))
    : addDays(startDate, horizonDays);

  const result: Date[] = [];
  if (details.frequencyType === 'every_n_hours') {
    const hours = Math.max(1, Number(details.everyNHours || 8));
    const start = buildDateTime(details.startDate, timesOfDay[0] || DEFAULT_PRESETS[0]);
    if (!start) return [];
    const endLimit = addDays(endDate, 1);
    for (let cursor = start; !isAfter(cursor, endLimit); cursor = addHours(cursor, hours)) {
      result.push(new Date(cursor));
    }
  } else {
    for (let cursor = startDate; !isAfter(cursor, endDate); cursor = addDays(cursor, 1)) {
      timesOfDay.forEach((timeStr) => {
        const at = buildDateTime(cursor.toISOString().slice(0, 10), timeStr);
        if (at) {
          result.push(at);
        }
      });
    }
  }

  return result
    .filter((date) => Number.isFinite(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime())
    .map((date) => date.toISOString());
}

export function getFirstMedicationDose(details: MedicationDetails) {
  return getMedicationDoseTimes(details, 1)[0] ?? null;
}

export async function ensureMedicationDoses(reminderId: string, details: MedicationDetails) {
  const supabase = createServerClient();
  const planned = getMedicationDoseTimes(details);
  if (!planned.length) return [];

  const start = planned[0];
  const end = planned[planned.length - 1];
  const { data: existing, error } = await supabase
    .from('medication_doses')
    .select('scheduled_at')
    .eq('reminder_id', reminderId)
    .gte('scheduled_at', start)
    .lte('scheduled_at', end);
  if (error) {
    console.error('[medication] load existing doses failed', error);
    return [];
  }

  const existingSet = new Set((existing ?? []).map((row: any) => row.scheduled_at));
  const inserts = planned
    .filter((scheduled_at) => !existingSet.has(scheduled_at))
    .map((scheduled_at) => ({
      reminder_id: reminderId,
      scheduled_at,
      status: 'pending'
    }));

  if (!inserts.length) return [];
  const { data: created, error: insertError } = await supabase
    .from('medication_doses')
    .insert(inserts)
    .select('id, scheduled_at, status');
  if (insertError) {
    console.error('[medication] insert doses failed', insertError);
    return [];
  }
  return created ?? [];
}

export async function getTodayMedicationDoses(householdId: string, now = new Date()) {
  const supabase = createServerClient();
  const dayStart = new Date(now);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(now);
  dayEnd.setUTCHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from('medication_doses')
    .select('id, scheduled_at, status, skipped_reason, taken_at, reminder:reminders!inner(id, title, medication_details, household_id, created_by, kind)')
    .eq('reminders.household_id', householdId)
    .gte('scheduled_at', dayStart.toISOString())
    .lte('scheduled_at', dayEnd.toISOString())
    .order('scheduled_at');
  if (error) {
    console.error('[medication] load today doses failed', error);
    return [];
  }
  return (data ?? []).map((dose: any) => ({
    ...dose,
    reminder: Array.isArray(dose.reminder) ? dose.reminder[0] ?? null : dose.reminder ?? null
  }));
}
