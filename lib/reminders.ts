import { addDays, addMinutes, addMonths, addWeeks, startOfDay } from 'date-fns';

export type ScheduleType = 'once' | 'daily' | 'weekly' | 'monthly';

export function getNextOccurrence(occurAt: Date, scheduleType: ScheduleType) {
  if (scheduleType === 'daily') {
    return addDays(occurAt, 1);
  }
  if (scheduleType === 'weekly') {
    return addWeeks(occurAt, 1);
  }
  if (scheduleType === 'monthly') {
    return addMonths(occurAt, 1);
  }
  return null;
}

export function snoozeByMinutes(occurAt: Date, minutes: number) {
  return addMinutes(occurAt, minutes);
}

export function snoozeTomorrow(now: Date) {
  return startOfDay(addDays(now, 1));
}
