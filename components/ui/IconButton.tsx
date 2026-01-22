"use client";

import type { ButtonHTMLAttributes, ReactNode } from 'react';

export default function IconButton({
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      type="button"
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
