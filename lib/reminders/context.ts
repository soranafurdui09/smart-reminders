export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface TimeWindowContext {
  enabled: boolean;
  startHour: number;
  endHour: number;
  daysOfWeek: DayOfWeek[];
}

export interface CalendarBusyContext {
  enabled: boolean;
  snoozeMinutes: number;
}

export interface ContextSettings {
  timeWindow?: TimeWindowContext;
  calendarBusy?: CalendarBusyContext;
  category?: string | null;
}

export function getDefaultContextSettings(): ContextSettings {
  return {
    timeWindow: {
      enabled: false,
      startHour: 9,
      endHour: 20,
      daysOfWeek: []
    },
    calendarBusy: {
      enabled: false,
      snoozeMinutes: 15
    }
  };
}

function sanitizeHour(value: any): number {
  const num = Number(value);
  if (Number.isNaN(num) || num < 0) return 0;
  if (num > 23) return 23;
  return Math.floor(num);
}

function sanitizeMinutes(value: any): number {
  const num = Number(value);
  if (Number.isNaN(num) || num <= 0) return 15;
  if (num > 1440) return 1440;
  return Math.floor(num);
}

function sanitizeDay(day?: string): DayOfWeek | null {
  if (!day) return null;
  const normalized = day.toLowerCase();
  const allowed: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  return allowed.includes(normalized as DayOfWeek) ? (normalized as DayOfWeek) : null;
}

export function parseContextSettings(raw: any | null | undefined): ContextSettings {
  const defaults = getDefaultContextSettings();
  if (typeof raw !== 'object' || raw === null) {
    return defaults;
  }
  const category = typeof raw.category === 'string' ? raw.category : null;
  const timeWindow = typeof raw.timeWindow === 'object' && raw.timeWindow ? raw.timeWindow : {};
  const calendarBusy = typeof raw.calendarBusy === 'object' && raw.calendarBusy ? raw.calendarBusy : {};
  const defaultTimeWindow = defaults.timeWindow ?? {
    enabled: false,
    startHour: 9,
    endHour: 20,
    daysOfWeek: []
  };
  const defaultCalendarBusy = defaults.calendarBusy ?? {
    enabled: false,
    snoozeMinutes: 15
  };

  const parsedTimeWindow: TimeWindowContext = {
    enabled: Boolean(timeWindow.enabled),
    startHour: sanitizeHour(timeWindow.startHour ?? defaultTimeWindow.startHour),
    endHour: sanitizeHour(timeWindow.endHour ?? defaultTimeWindow.endHour),
    daysOfWeek: Array.isArray(timeWindow.daysOfWeek)
      ? (timeWindow.daysOfWeek
        .map((item: string | undefined) => sanitizeDay(item))
        .filter(Boolean) as DayOfWeek[])
      : []
  };
  const parsedCalendarBusy: CalendarBusyContext = {
    enabled: Boolean(calendarBusy.enabled),
    snoozeMinutes: sanitizeMinutes(calendarBusy.snoozeMinutes ?? defaultCalendarBusy.snoozeMinutes)
  };
  return {
    timeWindow: parsedTimeWindow,
    calendarBusy: parsedCalendarBusy,
    category
  };
}

export function isDefaultContextSettings(settings: ContextSettings): boolean {
  return !settings.timeWindow?.enabled && !settings.calendarBusy?.enabled;
}

export type ContextDecisionType = 'send_now' | 'skip_for_now' | 'auto_snooze';

export interface ContextDecision {
  type: ContextDecisionType;
  newScheduledAt?: string;
  reason?: string;
}

export interface ContextEvaluationInput {
  now: Date;
  reminderDueAt: Date;
  settings: ContextSettings;
  isCalendarBusy: boolean;
}

const dayMap: DayOfWeek[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday'
];

function getDayOfWeek(date: Date): DayOfWeek {
  return dayMap[date.getDay()];
}

export function evaluateReminderContext(input: ContextEvaluationInput): ContextDecision {
  const { now, settings, isCalendarBusy } = input;
  const defaults = getDefaultContextSettings();
  const timeWindowSettings = settings.timeWindow ?? defaults.timeWindow;
  const day = getDayOfWeek(now);
  if (timeWindowSettings?.enabled) {
    const withinDay =
      timeWindowSettings.daysOfWeek.length === 0 || timeWindowSettings.daysOfWeek.includes(day);
    if (!withinDay) {
      return { type: 'skip_for_now', reason: 'outside_day_window' };
    }
    const currentHour = now.getHours();
    if (
      currentHour < (timeWindowSettings?.startHour ?? 0) ||
      currentHour >= (timeWindowSettings?.endHour ?? 24)
    ) {
      return { type: 'skip_for_now', reason: 'outside_time_window' };
    }
  }
  const calendarSettings = settings.calendarBusy ?? defaults.calendarBusy ?? {
    enabled: false,
    snoozeMinutes: 15
  };
  if (calendarSettings.enabled && isCalendarBusy) {
    const snoozeMs = calendarSettings.snoozeMinutes * 60000;
    const newDate = new Date(now.getTime() + snoozeMs);
    return {
      type: 'auto_snooze',
      newScheduledAt: newDate.toISOString(),
      reason: 'calendar_busy'
    };
  }
  return { type: 'send_now' };
}
