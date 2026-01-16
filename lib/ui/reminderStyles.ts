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

const CATEGORY_STYLES: Record<ReminderCategory, {
  cardBg: string;
  accent: string;
  pillBg: string;
  pillText: string;
  buttonBg: string;
  buttonHover: string;
}> = {
  health_medication: {
    cardBg: 'bg-emerald-50/90 dark:bg-slate-900/70 dark:ring-1 dark:ring-emerald-400/40',
    accent: 'text-emerald-700',
    pillBg: 'bg-emerald-500',
    pillText: 'text-white',
    buttonBg: 'bg-emerald-500',
    buttonHover: 'hover:bg-emerald-600'
  },
  car_auto: {
    cardBg: 'bg-orange-50/90 dark:bg-slate-900/70 dark:ring-1 dark:ring-orange-400/40',
    accent: 'text-orange-700',
    pillBg: 'bg-orange-500',
    pillText: 'text-white',
    buttonBg: 'bg-orange-500',
    buttonHover: 'hover:bg-orange-600'
  },
  home_maintenance: {
    cardBg: 'bg-sky-50/90 dark:bg-slate-900/70 dark:ring-1 dark:ring-sky-400/40',
    accent: 'text-sky-700',
    pillBg: 'bg-sky-500',
    pillText: 'text-white',
    buttonBg: 'bg-sky-500',
    buttonHover: 'hover:bg-sky-600'
  },
  family_kids: {
    cardBg: 'bg-fuchsia-50/90 dark:bg-slate-900/70 dark:ring-1 dark:ring-fuchsia-400/40',
    accent: 'text-fuchsia-700',
    pillBg: 'bg-fuchsia-500',
    pillText: 'text-white',
    buttonBg: 'bg-fuchsia-500',
    buttonHover: 'hover:bg-fuchsia-600'
  },
  shopping_groceries: {
    cardBg: 'bg-yellow-50/90 dark:bg-slate-900/70 dark:ring-1 dark:ring-yellow-400/40',
    accent: 'text-yellow-700',
    pillBg: 'bg-yellow-500',
    pillText: 'text-white',
    buttonBg: 'bg-yellow-500',
    buttonHover: 'hover:bg-yellow-600'
  },
  personal_admin: {
    cardBg: 'bg-indigo-50/90 dark:bg-slate-900/70 dark:ring-1 dark:ring-indigo-400/40',
    accent: 'text-indigo-700',
    pillBg: 'bg-indigo-500',
    pillText: 'text-white',
    buttonBg: 'bg-indigo-500',
    buttonHover: 'hover:bg-indigo-600'
  },
  general: {
    cardBg: 'bg-slate-50 dark:bg-slate-900/70 dark:ring-1 dark:ring-slate-700/60',
    accent: 'text-slate-700',
    pillBg: 'bg-slate-500',
    pillText: 'text-white',
    buttonBg: 'bg-slate-500',
    buttonHover: 'hover:bg-slate-600'
  }
};

const URGENCY_CLASSES: Record<ReminderUrgency, { strip: string; status: string }> = {
  overdue: {
    strip: 'bg-red-500',
    status: 'border border-red-100 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-slate-900/70 dark:text-red-300'
  },
  today: {
    strip: 'bg-amber-400',
    status: 'border border-sky-400 bg-white/80 text-sky-600 dark:border-sky-500/50 dark:bg-slate-900/80 dark:text-sky-300'
  },
  upcoming: {
    strip: 'bg-blue-400',
    status: 'border border-slate-100 bg-white/70 text-slate-600 dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-300'
  },
  completed: {
    strip: 'bg-green-400',
    status: 'border border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-slate-900/70 dark:text-emerald-300'
  }
};

export function getUrgencyClasses(urgency: ReminderUrgency) {
  return URGENCY_CLASSES[urgency];
}

export function getCategoryClasses(category: ReminderCategory) {
  const styles = CATEGORY_STYLES[category];
  return {
    badgeBg: styles.pillBg,
    badgeText: styles.pillText,
    label: CATEGORY_LABELS[category]
  };
}

export function getReminderCategoryStyle(category: ReminderCategory) {
  const styles = CATEGORY_STYLES[category];
  return {
    cardBg: styles.cardBg,
    accent: styles.accent,
    pillBg: styles.pillBg,
    pillText: styles.pillText,
    buttonBg: styles.buttonBg,
    buttonHover: styles.buttonHover,
    label: CATEGORY_LABELS[category]
  };
}
