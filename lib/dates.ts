import { differenceInCalendarDays, format } from 'date-fns';
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';

type DateInput = Date | string;

function hasTimeZoneOffset(value: string) {
  return /[zZ]$/.test(value) || /[+-]\d{2}:?\d{2}$/.test(value);
}

export function coerceDateForTimeZone(value: DateInput, timeZone?: string | null) {
  if (value instanceof Date) {
    return value;
  }
  if (!timeZone || timeZone === 'UTC') {
    return new Date(value);
  }
  if (hasTimeZoneOffset(value)) {
    return new Date(value);
  }
  return interpretAsTimeZone(value, timeZone);
}

function toTimeZoneDate(value: DateInput, timeZone?: string | null) {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (!timeZone) {
    return date;
  }
  try {
    return toZonedTime(date, timeZone);
  } catch {
    return date;
  }
}

export function formatDateTimeWithTimeZone(value: DateInput | null | undefined, timeZone?: string | null) {
  if (!value) return '';
  const safeDate = typeof value === 'string' ? new Date(value) : value;
  if (!(safeDate instanceof Date) || Number.isNaN(safeDate.getTime())) return '';
  if (timeZone) {
    try {
      return formatInTimeZone(safeDate, timeZone, 'dd MMM yyyy HH:mm');
    } catch {
      return format(safeDate, 'dd MMM yyyy HH:mm');
    }
  }
  return format(safeDate, 'dd MMM yyyy HH:mm');
}

export function resolveReminderTimeZone(reminderTimeZone?: string | null, userTimeZone?: string | null) {
  if (reminderTimeZone && reminderTimeZone !== 'UTC') {
    return reminderTimeZone;
  }
  if (userTimeZone) {
    return userTimeZone;
  }
  return reminderTimeZone ?? null;
}

export function interpretAsTimeZone(value: DateInput, timeZone: string) {
  if (!timeZone || timeZone === 'UTC') {
    return typeof value === 'string' ? new Date(value) : value;
  }
  if (typeof value === 'string') {
    if (hasTimeZoneOffset(value)) {
      return new Date(value);
    }
    return fromZonedTime(value, timeZone);
  }
  return fromZonedTime(value, timeZone);
}

export function diffDaysInTimeZone(date: DateInput, base: DateInput, timeZone: string) {
  const dateValue = typeof date === 'string' ? new Date(date) : date;
  const baseValue = typeof base === 'string' ? new Date(base) : base;
  const zonedDate = toZonedTime(dateValue, timeZone);
  const zonedBase = toZonedTime(baseValue, timeZone);
  return differenceInCalendarDays(zonedDate, zonedBase);
}

export function getMonthKeyInTimeZone(date: DateInput, timeZone: string) {
  const value = typeof date === 'string' ? new Date(date) : date;
  const zoned = toZonedTime(value, timeZone);
  return `${zoned.getFullYear()}-${String(zoned.getMonth() + 1).padStart(2, '0')}`;
}

export function formatReminderDateTime(value: DateInput, reminderTimeZone?: string | null, userTimeZone?: string | null) {
  const resolved = resolveReminderTimeZone(reminderTimeZone, userTimeZone);
  if (!resolved || resolved === 'UTC') {
    return formatDateTimeWithTimeZone(value, resolved);
  }
  if (typeof value === 'string') {
    const date = hasTimeZoneOffset(value)
      ? new Date(value)
      : interpretAsTimeZone(value, resolved);
    return formatDateTimeWithTimeZone(date, resolved);
  }
  return formatDateTimeWithTimeZone(value, resolved);
}
