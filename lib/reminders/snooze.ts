export type SnoozeOptionId =
  | 'later-today'
  | 'tomorrow'
  | 'this-weekend'
  | 'next-week'
  | 'before-due-3-days'
  | 'before-due-1-day'
  | 'in-1-hour'
  | 'in-2-hours'
  | 'custom';

export interface SnoozeOption {
  id: SnoozeOptionId;
  label: string;
  target: Date | 'custom';
}

export interface SmartSnoozeContext {
  now: Date;
  category: string | null;
  dueAt: Date | null;
}

const DEFAULT_HOUR = 9;
const LATER_TODAY_HOUR = 20;
const WEEKEND_HOUR = 10;
const MS_IN_DAY = 24 * 60 * 60 * 1000;

const MED_KEYWORDS = ['med', 'meds', 'medicament', 'medicine', 'sanatate', 'health', 'doctor'];

function setTime(base: Date, hour: number, minute = 0) {
  const next = new Date(base);
  next.setHours(hour, minute, 0, 0);
  return next;
}

function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function addHours(base: Date, hours: number) {
  const next = new Date(base);
  next.setHours(next.getHours() + hours);
  return next;
}

function isFuture(target: Date, now: Date) {
  return target.getTime() > now.getTime();
}

function normalizeCategory(value?: string | null) {
  if (!value) return null;
  return value.trim().toLowerCase();
}

export function inferReminderCategory(input: {
  title?: string | null;
  notes?: string | null;
  category?: string | null;
}) {
  const direct = normalizeCategory(input.category);
  if (direct) return direct;
  const haystack = `${input.title ?? ''} ${input.notes ?? ''}`.toLowerCase();
  if (!haystack.trim()) return null;
  if (haystack.includes('med') || haystack.includes('medic') || haystack.includes('doctor')) {
    return 'meds';
  }
  if (haystack.includes('factur') || haystack.includes('banca') || haystack.includes('rata')) {
    return 'bills';
  }
  if (haystack.includes('itp') || haystack.includes('rca') || haystack.includes('auto')) {
    return 'car';
  }
  if (haystack.includes('casa') || haystack.includes('locuinta') || haystack.includes('centrala')) {
    return 'home';
  }
  return null;
}

function isMedsCategory(category: string | null) {
  if (!category) return false;
  return MED_KEYWORDS.some((keyword) => category.includes(keyword));
}

function getLaterToday(now: Date) {
  if (now.getHours() < 17) {
    return setTime(now, LATER_TODAY_HOUR);
  }
  const lateTarget = setTime(now, LATER_TODAY_HOUR);
  if (isFuture(lateTarget, now)) {
    return lateTarget;
  }
  return setTime(addDays(now, 1), DEFAULT_HOUR);
}

function getTomorrow(now: Date) {
  return setTime(addDays(now, 1), DEFAULT_HOUR);
}

function getWeekend(now: Date) {
  const day = now.getDay();
  if (day === 6) {
    const today = setTime(now, WEEKEND_HOUR);
    if (isFuture(today, now)) {
      return today;
    }
    return setTime(addDays(now, 1), WEEKEND_HOUR);
  }
  if (day === 0) {
    const today = setTime(now, WEEKEND_HOUR);
    if (isFuture(today, now)) {
      return today;
    }
    return setTime(addDays(now, 6), WEEKEND_HOUR);
  }
  const daysToSaturday = (6 - day + 7) % 7;
  return setTime(addDays(now, daysToSaturday), WEEKEND_HOUR);
}

function getNextWeek(now: Date) {
  const day = now.getDay();
  const raw = (8 - day) % 7;
  const daysToMonday = raw === 0 ? 7 : raw;
  return setTime(addDays(now, daysToMonday), DEFAULT_HOUR);
}

function getBeforeDue(dueAt: Date, daysBefore: number) {
  return setTime(addDays(dueAt, -daysBefore), DEFAULT_HOUR);
}

export function getSmartSnoozeOptions(ctx: SmartSnoozeContext): SnoozeOption[] {
  // Current flow: occurrences drive the next due time; snoozed_until overrides it when present.
  const now = ctx.now;
  const category = normalizeCategory(ctx.category);
  const options: SnoozeOption[] = [];

  const baseOptions: SnoozeOption[] = [
    { id: 'later-today', label: 'Mai târziu azi', target: getLaterToday(now) },
    { id: 'tomorrow', label: 'Mâine', target: getTomorrow(now) },
    { id: 'this-weekend', label: 'Weekendul acesta', target: getWeekend(now) },
    { id: 'next-week', label: 'Săptămâna viitoare', target: getNextWeek(now) }
  ];

  baseOptions.forEach((option) => {
    if (option.target !== 'custom' && isFuture(option.target, now)) {
      options.push(option);
    }
  });

  if (ctx.dueAt) {
    const due = ctx.dueAt;
    const msUntilDue = due.getTime() - now.getTime();
    if (msUntilDue >= 3 * MS_IN_DAY) {
      const target = getBeforeDue(due, 3);
      if (isFuture(target, now)) {
        options.push({
          id: 'before-due-3-days',
          label: 'Cu 3 zile înainte de scadență',
          target
        });
      }
    }
    if (msUntilDue >= MS_IN_DAY) {
      const target = getBeforeDue(due, 1);
      if (isFuture(target, now)) {
        options.push({
          id: 'before-due-1-day',
          label: 'Cu 1 zi înainte de scadență',
          target
        });
      }
    }
  }

  if (isMedsCategory(category)) {
    options.push({ id: 'in-1-hour', label: 'În 1 oră', target: addHours(now, 1) });
    options.push({ id: 'in-2-hours', label: 'În 2 ore', target: addHours(now, 2) });
  }

  options.push({ id: 'custom', label: 'Alege dată și oră', target: 'custom' });

  return options.slice(0, 8);
}

// Future hook: replace getSmartSnoozeOptions with AI-assisted suggestions while keeping this fallback.
