import { type ReminderCategoryId } from '@/lib/categories';

export type CategoryKey =
  | 'health_medication'
  | 'car_auto'
  | 'home_maintenance'
  | 'shopping_groceries'
  | 'family_kids'
  | 'personal_admin'
  | 'general';

export type StatusKey = 'overdue' | 'today' | 'upcoming' | 'completed' | 'open';

export type UrgencyKey = 'overdue' | 'today' | 'upcoming' | 'open';

const CATEGORY_KEY_MAP: Record<ReminderCategoryId, CategoryKey> = {
  health: 'health_medication',
  car: 'car_auto',
  home: 'home_maintenance',
  shopping: 'shopping_groceries',
  family: 'family_kids',
  personal: 'personal_admin',
  default: 'general'
};

const CATEGORY_STYLES: Record<CategoryKey, { bg: string; text: string }> = {
  health_medication: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  car_auto: { bg: 'bg-orange-50', text: 'text-orange-700' },
  home_maintenance: { bg: 'bg-sky-50', text: 'text-sky-700' },
  shopping_groceries: { bg: 'bg-yellow-50', text: 'text-yellow-700' },
  family_kids: { bg: 'bg-purple-50', text: 'text-purple-700' },
  personal_admin: { bg: 'bg-indigo-50', text: 'text-indigo-700' },
  general: { bg: 'bg-slate-100', text: 'text-slate-700' }
};

const STATUS_STYLES: Record<StatusKey, string> = {
  overdue: 'border border-red-200 bg-red-50 text-red-700',
  today: 'border border-amber-200 bg-amber-50 text-amber-700',
  upcoming: 'border border-sky-200 bg-sky-50 text-sky-700',
  completed: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
  open: 'border border-slate-200 bg-slate-100 text-slate-600'
};

const URGENCY_BAR_STYLES: Record<StatusKey, string> = {
  overdue: 'bg-red-500',
  today: 'bg-amber-400',
  upcoming: 'bg-sky-400',
  completed: 'bg-slate-300',
  open: 'bg-slate-300'
};

type VisualInput = {
  status?: string | null;
  urgencyKey?: UrgencyKey | null;
  categoryId: ReminderCategoryId;
};

export function getReminderVisualContext({ status, urgencyKey, categoryId }: VisualInput) {
  const categoryKey = CATEGORY_KEY_MAP[categoryId] ?? 'general';
  const isDone = status === 'done';
  const isSnoozed = status === 'snoozed';
  const normalizedUrgency = urgencyKey && urgencyKey !== 'open' ? urgencyKey : null;
  const statusKey: StatusKey = isDone
    ? 'completed'
    : isSnoozed
      ? 'today'
      : normalizedUrgency ?? 'open';
  const barKey: StatusKey = normalizedUrgency ?? (isDone ? 'completed' : 'open');

  return {
    categoryKey,
    categoryStyle: CATEGORY_STYLES[categoryKey],
    statusKey,
    statusClass: STATUS_STYLES[statusKey],
    urgencyBarClass: URGENCY_BAR_STYLES[barKey]
  };
}
