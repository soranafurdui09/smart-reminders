import { format } from 'date-fns';

type DateInput = Date | string;

function toTimeZoneDate(value: DateInput, timeZone?: string | null) {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (!timeZone) {
    return date;
  }
  try {
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
