import { inferReminderCategory } from '@/lib/reminders/snooze';

export type ReminderCategoryId =
  | 'health'
  | 'car'
  | 'home'
  | 'family'
  | 'personal'
  | 'shopping'
  | 'default';

export type ReminderCategory = {
  id: ReminderCategoryId;
  label: string;
  color: string;
};

export const reminderCategories: ReminderCategory[] = [
  { id: 'health', label: 'Health & Medication', color: '#81C784' },
  { id: 'car', label: 'Car & Auto', color: '#F6A56F' },
  { id: 'home', label: 'Home & Maintenance', color: '#64B5F6' },
  { id: 'family', label: 'Family & Kids', color: '#BA90C6' },
  { id: 'personal', label: 'Personal & Admin', color: '#4DB6AC' },
  { id: 'shopping', label: 'Shopping & Groceries', color: '#FFE082' },
  { id: 'default', label: 'General', color: '#E0E0E0' }
];

const categoryMap = new Map(reminderCategories.map((category) => [category.id, category]));
const categoryIds = new Set(reminderCategories.map((category) => category.id));

const CATEGORY_KEYWORDS: Record<ReminderCategoryId, string[]> = {
  health: ['med', 'medic', 'pill', 'doctor', 'dentist', 'sanat', 'health'],
  car: ['car', 'auto', 'rca', 'itp', 'parcare', 'parking', 'service'],
  home: ['home', 'casa', 'locuinta', 'boiler', 'centrala', 'curatenie', 'cleaning'],
  family: ['famil', 'family', 'kid', 'kids', 'copil', 'parent', 'tata', 'mama'],
  personal: ['passport', 'buletin', 'id', 'acte', 'bank', 'rata', 'banca', 'tax', 'bills'],
  shopping: ['shop', 'shopping', 'market', 'grocery', 'cumpar', 'lista', 'supermarket'],
  default: []
};

function normalize(value?: string | null) {
  if (!value) return '';
  return value.trim().toLowerCase();
}

export function getReminderCategory(id?: ReminderCategoryId | null): ReminderCategory {
  if (id && categoryMap.has(id)) {
    return categoryMap.get(id) as ReminderCategory;
  }
  return categoryMap.get('default') as ReminderCategory;
}

export function isReminderCategoryId(value: string): value is ReminderCategoryId {
  return categoryIds.has(value as ReminderCategoryId);
}

export function inferReminderCategoryId(input: {
  title?: string | null;
  notes?: string | null;
  kind?: string | null;
  category?: string | null;
  medicationDetails?: unknown;
}): ReminderCategoryId {
  if (input.kind === 'medication' || input.medicationDetails) {
    return 'health';
  }

  const direct = normalize(input.category);
  if (direct && categoryMap.has(direct as ReminderCategoryId)) {
    return direct as ReminderCategoryId;
  }

  const inferred = inferReminderCategory({
    title: input.title,
    notes: input.notes,
    category: input.category
  });
  if (inferred === 'meds') return 'health';
  if (inferred === 'bills') return 'personal';
  if (inferred === 'car') return 'car';
  if (inferred === 'home') return 'home';

  const haystack = normalize(`${input.title ?? ''} ${input.notes ?? ''}`);
  if (!haystack) return 'default';

  const match = Object.entries(CATEGORY_KEYWORDS).find(([categoryId, keywords]) =>
    keywords.some((keyword) => haystack.includes(keyword))
  );
  if (match) return match[0] as ReminderCategoryId;

  return 'default';
}

export function hexToRgba(hex: string, alpha: number) {
  const cleaned = hex.replace('#', '');
  const base = cleaned.length === 3
    ? cleaned.split('').map((char) => char + char).join('')
    : cleaned;
  const value = Number.parseInt(base, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getCategoryChipStyle(color: string, active: boolean) {
  return {
    borderColor: color,
    backgroundColor: active ? hexToRgba(color, 0.25) : hexToRgba(color, 0.12),
    color: '#1f2937'
  };
}
