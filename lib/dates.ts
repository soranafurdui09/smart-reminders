import { format } from 'date-fns';

type DateInput = Date | string;

function getTimeZoneParts(value: DateInput, timeZone: string) {
  const date = typeof value === 'string' ? new Date(value) : value;
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
  const lookup: Record<string, string> = {};
  parts.forEach((part) => {
    if (part.type !== 'literal') {
      lookup[part.type] = part.value;
    }
  });
  const year = Number(lookup.year);
  const month = Number(lookup.month);
  const day = Number(lookup.day);
  const hour = Number(lookup.hour);
  const minute = Number(lookup.minute);
  return { year, month, day, hour, minute };
}

function parseIsoParts(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) {
    return null;
  }
  const [, year, month, day, hour, minute] = match.map(Number);
  if ([year, month, day, hour, minute].some((num) => Number.isNaN(num))) {
    return null;
  }
  return { year, month, day, hour, minute };
}

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

function getTimeZoneOffsetMinutes(date: Date, timeZone: string) {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'shortOffset'
    });
    const parts = formatter.formatToParts(date);
    const tzPart = parts.find((part) => part.type === 'timeZoneName')?.value || '';
    const match = /GMT([+-]\d{1,2})(?::(\d{2}))?/.exec(tzPart);
    if (!match) return 0;
    const sign = match[1].startsWith('-') ? -1 : 1;
    const hours = Math.abs(Number(match[1]));
    const minutes = Number(match[2] || '0');
    return sign * (hours * 60 + minutes);
  } catch {
    return 0;
  }
}

function toTimeZoneDate(value: DateInput, timeZone?: string | null) {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (!timeZone) {
    return date;
  }
  try {
    const { year, month, day, hour, minute } = getTimeZoneParts(date, timeZone);
    if ([year, month, day, hour, minute].some((num) => Number.isNaN(num))) {
      return date;
    }
    return new Date(year, month - 1, day, hour, minute);
  } catch {
    return date;
  }
}

export function formatDateTimeWithTimeZone(value: DateInput, timeZone?: string | null) {
  const safeDate = toTimeZoneDate(value, timeZone);
  if (Number.isNaN(safeDate.getTime())) {
    return '';
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
  if (typeof value === 'string') {
    const parts = parseIsoParts(value);
    if (parts) {
      const guess = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute));
      const offsetMinutes = getTimeZoneOffsetMinutes(guess, timeZone);
      return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute) - offsetMinutes * 60000);
    }
  }
  const { year, month, day, hour, minute } = getTimeZoneParts(value, timeZone);
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const offsetMinutes = getTimeZoneOffsetMinutes(guess, timeZone);
  return new Date(Date.UTC(year, month - 1, day, hour, minute) - offsetMinutes * 60000);
}

export function diffDaysInTimeZone(date: DateInput, base: DateInput, timeZone: string) {
  const dateParts = getTimeZoneParts(date, timeZone);
  const baseParts = getTimeZoneParts(base, timeZone);
  const dateKey = Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day);
  const baseKey = Date.UTC(baseParts.year, baseParts.month - 1, baseParts.day);
  return Math.floor((dateKey - baseKey) / 86400000);
}

export function getMonthKeyInTimeZone(date: DateInput, timeZone: string) {
  const parts = getTimeZoneParts(date, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, '0')}`;
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
