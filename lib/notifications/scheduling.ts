import { addMinutes } from 'date-fns';

export type CronWindow = {
  windowStart: Date;
  windowEnd: Date;
};

export type CronWindowOptions = {
  graceMinutes?: number;
  lookaheadMinutes?: number;
};

export function buildCronWindow(now: Date, options: CronWindowOptions = {}): CronWindow {
  const graceMinutes = Math.max(0, options.graceMinutes ?? 120);
  const lookaheadMinutes = Math.max(0, options.lookaheadMinutes ?? 17);
  return {
    windowStart: addMinutes(now, -graceMinutes),
    windowEnd: addMinutes(now, lookaheadMinutes)
  };
}

export function isJobDue(now: Date, windowStart: Date, jobTime: Date) {
  return jobTime >= windowStart && jobTime <= now;
}
