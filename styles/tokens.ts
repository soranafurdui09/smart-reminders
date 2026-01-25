export const colors = {
  bgGradient: 'bg-gradient-to-b from-[color:var(--bg-top)] via-[color:var(--bg-base)] to-[color:var(--bg-bottom)]',
  textPrimary: 'text-[color:var(--text-1)]',
  textSecondary: 'text-[color:var(--text-2)]',
  textMuted: 'text-[color:var(--text-3)]',
  accent: 'text-[color:rgb(var(--accent))]',
  overdue: 'text-[color:rgb(var(--danger))]'
} as const;

export const radii = {
  card: 'rounded-[var(--radius-card)]',
  pill: 'rounded-[var(--radius-pill)]'
} as const;

export const classCard = 'premium-card';
export const classTextPrimary = colors.textPrimary;
export const classTextSecondary = colors.textSecondary;
