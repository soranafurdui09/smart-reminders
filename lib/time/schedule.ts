import { endOfDay, startOfDay } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';

export type TimeZoneInput = string | null | undefined;

export function resolveTimeZone(value: TimeZoneInput, fallback = 'UTC') {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

export function localDateTimeToUtc(localDateTime: string, timeZone: string) {
  return fromZonedTime(localDateTime, timeZone);
}

export function localDateAndTimeToUtc(date: string, time: string, timeZone: string) {
  return fromZonedTime(`${date}T${time}`, timeZone);
}

export function getUtcDayBounds(date: Date, timeZone: string) {
  const zoned = toZonedTime(date, timeZone);
  const start = fromZonedTime(startOfDay(zoned), timeZone);
  const end = fromZonedTime(endOfDay(zoned), timeZone);
  return { start, end };
}
