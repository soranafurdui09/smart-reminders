import { addDays, addHours, addMinutes, isAfter, startOfDay } from 'date-fns';
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';
import { createServerClient } from '@/lib/supabase/server';
import { formatLocalDate, formatLocalTime, getUtcDayBounds, localDateAndTimeToUtc, resolveTimeZone } from '@/lib/time/schedule';

export type MedicationFrequencyType = 'once_per_day' | 'times_per_day' | 'every_n_hours';

export type MedicationForm = 'pill' | 'capsule' | 'drops' | 'injection' | 'other';

export type MedicationScheduleType = 'daily' | 'weekdays' | 'custom_days' | 'interval' | 'prn';

export type MedicationScheduleInput = {
  schedule_type: MedicationScheduleType;
  days_of_week?: number[] | null;
  times_local: string[];
  start_date: string;
  end_date?: string | null;
  interval_hours?: number | null;
  dose_amount?: number | null;
  dose_unit?: string | null;
  reminder_window_minutes?: number | null;
  allow_snooze?: boolean | null;
};

export type MedicationRecord = {
  id: string;
  reminder_id: string | null;
  household_id: string;
  created_by: string;
  patient_member_id?: string | null;
  name: string;
  form?: MedicationForm | null;
  strength?: string | null;
  notes?: string | null;
  is_active: boolean;
  timezone?: string | null;
};

export type MedicationStockRecord = {
  medication_id: string;
  quantity_on_hand: number;
  unit: string;
  decrement_per_dose: number;
  low_stock_threshold?: number | null;
  refill_lead_days?: number | null;
  refill_enabled?: boolean | null;
  last_refill_at?: string | null;
};

export type MedicationDoseInstance = {
  reminder_id: string;
  medication_id: string;
  household_id: string;
  patient_member_id?: string | null;
  scheduled_at: string;
  scheduled_local_date: string;
  scheduled_local_time: string;
  confirmation_deadline: string;
  status: 'pending';
  stock_decremented: boolean;
};

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

function buildDateTime(dateStr: string, timeStr: string, timeZone: string) {
  const parsed = parseTime(timeStr);
  if (!parsed) return null;
  const safeTime = `${String(parsed.hours).padStart(2, '0')}:${String(parsed.minutes).padStart(2, '0')}:00`;
  const local = `${dateStr}T${safeTime}`;
  return fromZonedTime(local, timeZone);
}

function addDaysInTimeZone(date: Date, days: number, timeZone: string) {
  const zoned = toZonedTime(date, timeZone);
  const nextZoned = addDays(zoned, days);
  return fromZonedTime(nextZoned, timeZone);
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

export function getMedicationDoseTimes(
  details: MedicationDetails,
  horizonDays = MAX_HORIZON_DAYS,
  timeZone?: string | null
) {
  const tz = resolveTimeZone(timeZone);
  const timesOfDay = normalizeTimes(details);
  const startValue = fromZonedTime(`${details.startDate}T00:00:00`, tz);
  if (Number.isNaN(startValue.getTime())) {
    return [];
  }
  const startDate = startOfDay(toZonedTime(startValue, tz));
  const endDate = details.endDate
    ? startOfDay(toZonedTime(fromZonedTime(`${details.endDate}T00:00:00`, tz), tz))
    : addDays(startDate, horizonDays);

  const result: Date[] = [];
  if (details.frequencyType === 'every_n_hours') {
    const hours = Math.max(1, Number(details.everyNHours || 8));
    const start = buildDateTime(details.startDate, timesOfDay[0] || DEFAULT_PRESETS[0], tz);
    if (!start) return [];
    const endLimit = addDaysInTimeZone(fromZonedTime(formatInTimeZone(endDate, tz, 'yyyy-MM-dd'), tz), 1, tz);
    for (let cursor = start; !isAfter(cursor, endLimit); cursor = addHours(cursor, hours)) {
      result.push(new Date(cursor));
    }
  } else {
    const startCursor = fromZonedTime(formatInTimeZone(startDate, tz, 'yyyy-MM-dd'), tz);
    const endCursor = fromZonedTime(formatInTimeZone(endDate, tz, 'yyyy-MM-dd'), tz);
    for (let cursor = startCursor; !isAfter(cursor, endCursor); cursor = addDaysInTimeZone(cursor, 1, tz)) {
      const dayKey = formatInTimeZone(cursor, tz, 'yyyy-MM-dd');
      timesOfDay.forEach((timeStr) => {
        const at = buildDateTime(dayKey, timeStr, tz);
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

export function getFirstMedicationDose(details: MedicationDetails, timeZone?: string | null) {
  return getMedicationDoseTimes(details, 1, timeZone)[0] ?? null;
}

function normalizeScheduleTimes(times: string[]) {
  return times.filter(Boolean).map((value) => value.trim()).filter(Boolean);
}

function resolveScheduleDays(schedule: MedicationScheduleInput) {
  if (schedule.schedule_type === 'weekdays') {
    return [1, 2, 3, 4, 5];
  }
  if (schedule.schedule_type === 'custom_days' && schedule.days_of_week?.length) {
    return schedule.days_of_week;
  }
  return null;
}

export function buildMedicationDoseInstances(options: {
  medication: MedicationRecord;
  schedule: MedicationScheduleInput;
  horizonDays?: number;
  timeZone?: string | null;
}) {
  const { medication, schedule, horizonDays = 7, timeZone } = options;
  if (schedule.schedule_type === 'prn') return [];
  const tz = resolveTimeZone(timeZone || medication.timezone);
  const times = normalizeScheduleTimes(schedule.times_local || []);
  if (!times.length) return [];

  const startDate = schedule.start_date;
  const endDate = schedule.end_date ?? null;
  const reminderWindow = Math.max(10, Number(schedule.reminder_window_minutes ?? 60));

  const startBase = fromZonedTime(`${startDate}T00:00:00`, tz);
  if (Number.isNaN(startBase.getTime())) return [];
  const endBase = endDate
    ? fromZonedTime(`${endDate}T00:00:00`, tz)
    : addDays(startBase, horizonDays);

  const instances: MedicationDoseInstance[] = [];
  const daysFilter = resolveScheduleDays(schedule);

  if (schedule.schedule_type === 'interval') {
    const hours = Math.max(1, Number(schedule.interval_hours ?? 8));
    const startTime = times[0] ?? '08:00';
    const firstAt = localDateAndTimeToUtc(startDate, startTime, tz);
    for (let cursor = firstAt; !isAfter(cursor, endBase); cursor = addHours(cursor, hours)) {
      const iso = cursor.toISOString();
      instances.push({
        reminder_id: medication.reminder_id ?? '',
        medication_id: medication.id,
        household_id: medication.household_id,
        patient_member_id: medication.patient_member_id ?? null,
        scheduled_at: iso,
        scheduled_local_date: formatLocalDate(iso, tz),
        scheduled_local_time: formatLocalTime(iso, tz),
        confirmation_deadline: addMinutes(cursor, reminderWindow).toISOString(),
        status: 'pending',
        stock_decremented: false
      });
    }
  } else {
    for (let cursor = startBase; !isAfter(cursor, endBase); cursor = addDays(cursor, 1)) {
      const localDay = toZonedTime(cursor, tz);
      const day = localDay.getDay();
      if (daysFilter && !daysFilter.includes(day)) continue;
      const dayKey = formatInTimeZone(localDay, tz, 'yyyy-MM-dd');
      times.forEach((timeStr) => {
        const scheduled = localDateAndTimeToUtc(dayKey, timeStr, tz);
        const iso = scheduled.toISOString();
        instances.push({
          reminder_id: medication.reminder_id ?? '',
          medication_id: medication.id,
          household_id: medication.household_id,
          patient_member_id: medication.patient_member_id ?? null,
          scheduled_at: iso,
          scheduled_local_date: formatLocalDate(iso, tz),
          scheduled_local_time: formatLocalTime(iso, tz),
          confirmation_deadline: addMinutes(scheduled, reminderWindow).toISOString(),
          status: 'pending',
          stock_decremented: false
        });
      });
    }
  }
  return instances;
}

export function estimateDailyDoseCount(schedule: MedicationScheduleInput) {
  if (schedule.schedule_type === 'prn') return 0;
  if (schedule.schedule_type === 'interval') {
    const interval = Math.max(1, Number(schedule.interval_hours ?? 8));
    return Math.ceil(24 / interval);
  }
  const times = normalizeScheduleTimes(schedule.times_local || []);
  return Math.max(1, times.length);
}

export function shouldTriggerRefill(options: {
  stock: MedicationStockRecord;
  schedule: MedicationScheduleInput;
}) {
  const { stock, schedule } = options;
  if (stock.refill_enabled === false) return false;
  const qty = Number(stock.quantity_on_hand || 0);
  const threshold = stock.low_stock_threshold;
  if (typeof threshold === 'number' && qty <= threshold) return true;
  const perDose = Math.max(1, Number(stock.decrement_per_dose || 1));
  const dosesLeft = Math.floor(qty / perDose);
  const daily = estimateDailyDoseCount(schedule);
  if (!daily) return false;
  const daysLeft = dosesLeft / daily;
  if (typeof stock.refill_lead_days === 'number' && daysLeft <= stock.refill_lead_days) {
    return true;
  }
  return false;
}

export async function ensureMedicationDoses(
  reminderId: string,
  details: MedicationDetails,
  timeZone?: string | null
) {
  const supabase = createServerClient();
  const planned = getMedicationDoseTimes(details, MAX_HORIZON_DAYS, timeZone);
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

export async function ensureMedicationScheduleDoses(options: {
  medication: MedicationRecord;
  schedule: MedicationScheduleInput;
  horizonDays?: number;
  timeZone?: string | null;
}) {
  const { medication, schedule, horizonDays = 7, timeZone } = options;
  if (!medication.reminder_id) return [];
  const supabase = createServerClient();
  const planned = buildMedicationDoseInstances({ medication, schedule, horizonDays, timeZone });
  if (!planned.length) return [];

  const start = planned[0].scheduled_at;
  const end = planned[planned.length - 1].scheduled_at;
  const { data: existing, error } = await supabase
    .from('medication_doses')
    .select('scheduled_at')
    .eq('medication_id', medication.id)
    .gte('scheduled_at', start)
    .lte('scheduled_at', end);
  if (error) {
    console.error('[medication] load schedule doses failed', error);
    return [];
  }

  const existingSet = new Set((existing ?? []).map((row: any) => row.scheduled_at));
  const inserts = planned
    .filter((dose) => !existingSet.has(dose.scheduled_at))
    .map((dose) => ({
      reminder_id: medication.reminder_id,
      medication_id: medication.id,
      household_id: medication.household_id,
      scheduled_at: dose.scheduled_at,
      scheduled_local_date: dose.scheduled_local_date,
      scheduled_local_time: dose.scheduled_local_time,
      confirmation_deadline: dose.confirmation_deadline,
      status: 'pending',
      stock_decremented: false,
      patient_member_id: medication.patient_member_id ?? null
    }));

  if (!inserts.length) return [];
  const { data: created, error: insertError } = await supabase
    .from('medication_doses')
    .insert(inserts)
    .select('id, scheduled_at, status');
  if (insertError) {
    console.error('[medication] insert schedule doses failed', insertError);
    return [];
  }
  return created ?? [];
}

export async function getTodayMedicationDoses(householdId: string, now = new Date(), timeZone?: string | null) {
  const supabase = createServerClient();
  const tz = resolveTimeZone(timeZone);
  const { start: dayStart, end: dayEnd } = getUtcDayBounds(now, tz);

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
