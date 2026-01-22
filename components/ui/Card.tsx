"use client";

import type { ReactNode } from 'react';
import { classCard } from '@/styles/tokens';

export default function Card({
  children,
  className = ''
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`${classCard} ${className}`}>
      {children}
    </div>
  );
}
