export const colors = {
  bgGradient: 'bg-gradient-to-b from-[#0b1220] via-[#0a111d] to-[#06070b]',
  textPrimary: 'text-[color:var(--text-primary)]',
  textSecondary: 'text-[color:var(--text-secondary)]',
  textMuted: 'text-[color:var(--text-muted)]',
  accent: 'text-[color:var(--accent)]',
  overdue: 'text-[color:var(--danger)]'
} as const;

export const radii = {
  card: 'rounded-[var(--radius-card)]',
  pill: 'rounded-[var(--radius-pill)]'
} as const;

export const classCard = 'premium-card';
export const classTextPrimary = colors.textPrimary;
export const classTextSecondary = colors.textSecondary;
