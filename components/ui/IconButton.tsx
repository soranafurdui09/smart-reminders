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
      className={`premium-icon-btn inline-flex items-center justify-center ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
