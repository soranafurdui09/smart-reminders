"use client";

import type { ReactNode } from 'react';

export default function Pill({
  children,
  className = ''
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={`premium-pill inline-flex items-center uppercase tracking-wide ${className}`}>
      {children}
    </span>
  );
}
