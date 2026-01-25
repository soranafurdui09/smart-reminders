"use client";

import type { ButtonHTMLAttributes, ReactNode } from 'react';

export default function Chip({
  children,
  active = false,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; active?: boolean }) {
  return (
    <button
      type="button"
      className={`premium-chip ${active ? 'border-[color:rgba(245,158,11,0.45)] bg-[color:rgba(245,158,11,0.16)] text-ink' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
