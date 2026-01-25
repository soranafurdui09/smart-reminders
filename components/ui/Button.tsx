"use client";

import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';

export default function Button({
  children,
  className = '',
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; variant?: Variant }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60';
  const variantClass =
    variant === 'primary'
      ? 'premium-btn-primary'
      : variant === 'secondary'
        ? 'premium-btn-secondary'
        : 'bg-transparent text-muted hover:text-ink';
  return (
    <button type="button" className={`${base} ${variantClass} ${className}`} {...props}>
      {children}
    </button>
  );
}
