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
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${className}`}>
      {children}
    </span>
  );
}
