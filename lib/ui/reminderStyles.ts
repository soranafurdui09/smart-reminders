export type ReminderUrgency = 'overdue' | 'today' | 'upcoming' | 'completed';

export type ReminderCategory =
  | 'health_medication'
  | 'car_auto'
  | 'home_maintenance'
  | 'family_kids'
  | 'shopping_groceries'
  | 'personal_admin'
  | 'general';

const CATEGORY_LABELS: Record<ReminderCategory, string> = {
  health_medication: 'Health & Medication',
  car_auto: 'Car & Auto',
  home_maintenance: 'Home & Maintenance',
  family_kids: 'Family & Kids',
  shopping_groceries: 'Shopping & Groceries',
  personal_admin: 'Personal & Admin',
  general: 'General'
};

const CATEGORY_STYLES: Record<ReminderCategory, { badgeBg: string; badgeText: string }> = {
  health_medication: { badgeBg: 'bg-emerald-50', badgeText: 'text-emerald-700' },
  car_auto: { badgeBg: 'bg-orange-50', badgeText: 'text-orange-700' },
  home_maintenance: { badgeBg: 'bg-sky-50', badgeText: 'text-sky-700' },
  family_kids: { badgeBg: 'bg-violet-50', badgeText: 'text-violet-700' },
  shopping_groceries: { badgeBg: 'bg-yellow-50', badgeText: 'text-yellow-700' },
  personal_admin: { badgeBg: 'bg-indigo-50', badgeText: 'text-indigo-700' },
  general: { badgeBg: 'bg-slate-100', badgeText: 'text-slate-700' }
};

const URGENCY_CLASSES: Record<ReminderUrgency, { strip: string; status: string }> = {
  overdue: {
    strip: 'bg-red-500',
    status: 'border border-red-100 bg-red-50 text-red-700'
  },
  today: {
    strip: 'bg-amber-400',
    status: 'border border-amber-100 bg-amber-50 text-amber-700'
  },
  upcoming: {
    strip: 'bg-blue-400',
    status: 'border border-slate-100 bg-slate-50 text-slate-600'
  },
  completed: {
    strip: 'bg-green-400',
    status: 'border border-emerald-100 bg-emerald-50 text-emerald-700'
  }
};

export function getUrgencyClasses(urgency: ReminderUrgency) {
  return URGENCY_CLASSES[urgency];
}

export function getCategoryClasses(category: ReminderCategory) {
  const styles = CATEGORY_STYLES[category];
  return {
    badgeBg: styles.badgeBg,
    badgeText: styles.badgeText,
    label: CATEGORY_LABELS[category]
  };
}
