export type ReminderUrgency = 'overdue' | 'today' | 'soon' | 'upcoming' | 'completed';

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

const ACTION_BUTTON_BG = 'bg-accent text-white';
const ACTION_BUTTON_HOVER = 'hover:brightness-105';

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
    accent: 'text-emerald-200',
    pillBg: 'bg-emerald-400/15',
    pillText: 'text-emerald-100',
    buttonBg: ACTION_BUTTON_BG,
    buttonHover: ACTION_BUTTON_HOVER
  },
  car_auto: {
    cardBg: 'bg-transparent',
    accent: 'text-amber-200',
    pillBg: 'bg-amber-400/15',
    pillText: 'text-amber-100',
    buttonBg: ACTION_BUTTON_BG,
    buttonHover: ACTION_BUTTON_HOVER
  },
  home_maintenance: {
    cardBg: 'bg-transparent',
    accent: 'text-indigo-200',
    pillBg: 'bg-indigo-400/15',
    pillText: 'text-indigo-100',
    buttonBg: ACTION_BUTTON_BG,
    buttonHover: ACTION_BUTTON_HOVER
  },
  family_kids: {
    cardBg: 'bg-transparent',
    accent: 'text-pink-200',
    pillBg: 'bg-pink-400/15',
    pillText: 'text-pink-100',
    buttonBg: ACTION_BUTTON_BG,
    buttonHover: ACTION_BUTTON_HOVER
  },
  shopping_groceries: {
    cardBg: 'bg-transparent',
    accent: 'text-yellow-200',
    pillBg: 'bg-yellow-400/15',
    pillText: 'text-yellow-100',
    buttonBg: ACTION_BUTTON_BG,
    buttonHover: ACTION_BUTTON_HOVER
  },
  personal_admin: {
    cardBg: 'bg-transparent',
    accent: 'text-blue-200',
    pillBg: 'bg-blue-400/15',
    pillText: 'text-blue-100',
    buttonBg: ACTION_BUTTON_BG,
    buttonHover: ACTION_BUTTON_HOVER
  },
  general: {
    cardBg: 'bg-transparent',
    accent: 'text-slate-200',
    pillBg: 'bg-slate-500/15',
    pillText: 'text-slate-100',
    buttonBg: ACTION_BUTTON_BG,
    buttonHover: ACTION_BUTTON_HOVER
  }
};

const URGENCY_CLASSES: Record<ReminderUrgency, { strip: string; status: string }> = {
  overdue: {
    strip: 'bg-red-400/80',
    status: 'border border-red-400/25 bg-red-400/10 text-red-200'
  },
  soon: {
    strip: 'bg-amber-400/80',
    status: 'border border-amber-400/25 bg-amber-400/10 text-amber-200'
  },
  today: {
    strip: 'bg-blue-400/80',
    status: 'border border-blue-400/25 bg-blue-400/10 text-blue-200'
  },
  upcoming: {
    strip: 'bg-blue-400/80',
    status: 'border border-blue-400/25 bg-blue-400/10 text-blue-200'
  },
  completed: {
    strip: 'bg-slate-400/70',
    status: 'border border-slate-400/25 bg-slate-400/10 text-slate-300'
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
