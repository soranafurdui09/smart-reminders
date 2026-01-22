export const colors = {
  bgGradient: 'bg-gradient-to-b from-[#0b1220] via-[#0a111d] to-[#06070b]',
  surface: 'bg-[rgba(14,20,33,0.88)]',
  surfaceBorder: 'border-[rgba(255,255,255,0.06)]',
  textPrimary: 'text-slate-100',
  textSecondary: 'text-slate-300',
  accent: 'text-cyan-300',
  accentBg: 'bg-cyan-500/15',
  overdue: 'text-rose-400'
} as const;

export const radii = {
  card: 'rounded-3xl',
  pill: 'rounded-full'
} as const;

export const shadows = {
  soft: 'shadow-[0_24px_60px_rgba(6,12,24,0.45)]'
} as const;

export const classCard = `${radii.card} ${colors.surface} ${colors.surfaceBorder} border ${shadows.soft} backdrop-blur`;
export const classTextPrimary = colors.textPrimary;
export const classTextSecondary = colors.textSecondary;
