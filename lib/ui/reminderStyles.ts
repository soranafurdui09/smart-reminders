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

const ACTION_BUTTON_BG = 'bg-blue-500 text-white dark:bg-blue-400 dark:text-slate-900';
const ACTION_BUTTON_HOVER = 'hover:bg-blue-600 dark:hover:bg-blue-300';

const CATEGORY_STYLES: Record<ReminderCategory, {
  cardBg: string;
  accent: string;
  pillBg: string;
  pillText: string;
  buttonBg: string;
  buttonHover: string;
}> = {
  health_medication: {
    cardBg: 'bg-transparent',
    accent: 'text-emerald-700',
    pillBg: 'bg-emerald-500/20',
    pillText: 'text-emerald-700',
    buttonBg: ACTION_BUTTON_BG,
    buttonHover: ACTION_BUTTON_HOVER
  },
  car_auto: {
    cardBg: 'bg-transparent',
    accent: 'text-amber-700',
    pillBg: 'bg-amber-500/20',
    pillText: 'text-amber-700',
    buttonBg: ACTION_BUTTON_BG,
    buttonHover: ACTION_BUTTON_HOVER
  },
  home_maintenance: {
    cardBg: 'bg-transparent',
    accent: 'text-indigo-700',
    pillBg: 'bg-indigo-500/20',
    pillText: 'text-indigo-700',
    buttonBg: ACTION_BUTTON_BG,
    buttonHover: ACTION_BUTTON_HOVER
  },
  family_kids: {
    cardBg: 'bg-transparent',
    accent: 'text-pink-700',
    pillBg: 'bg-pink-500/20',
    pillText: 'text-pink-700',
    buttonBg: ACTION_BUTTON_BG,
    buttonHover: ACTION_BUTTON_HOVER
  },
  shopping_groceries: {
    cardBg: 'bg-transparent',
    accent: 'text-yellow-700',
    pillBg: 'bg-yellow-500/20',
    pillText: 'text-yellow-700',
    buttonBg: ACTION_BUTTON_BG,
    buttonHover: ACTION_BUTTON_HOVER
  },
  personal_admin: {
    cardBg: 'bg-transparent',
    accent: 'text-blue-700',
    pillBg: 'bg-blue-500/20',
    pillText: 'text-blue-700',
    buttonBg: ACTION_BUTTON_BG,
    buttonHover: ACTION_BUTTON_HOVER
  },
  general: {
    cardBg: 'bg-transparent',
    accent: 'text-slate-700',
    pillBg: 'bg-slate-500/20',
    pillText: 'text-slate-700',
    buttonBg: ACTION_BUTTON_BG,
    buttonHover: ACTION_BUTTON_HOVER
  }
};

const URGENCY_CLASSES: Record<ReminderUrgency, { strip: string; status: string }> = {
  overdue: {
    strip: 'bg-red-500',
    status: 'border border-red-100 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-white/5 dark:text-red-300'
  },
  today: {
    strip: 'bg-amber-500',
    status: 'border border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-white/5 dark:text-amber-300'
  },
  upcoming: {
    strip: 'bg-blue-500',
    status: 'border border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-white/5 dark:text-blue-300'
  },
  completed: {
    strip: 'bg-gray-500',
    status: 'border border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-600/60 dark:bg-white/5 dark:text-slate-300'
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
