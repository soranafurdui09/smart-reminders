'use client';

import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  spinner?: boolean;
};

export default function ActionSubmitButton({ children, className, spinner = true, disabled, ...props }: Props) {
  const { pending } = useFormStatus();
  return (
    <button
      {...props}
      className={`${className ?? ''} ${pending ? 'cursor-wait opacity-80' : ''}`}
      disabled={disabled || pending}
      aria-busy={pending}
    >
      {pending && spinner ? (
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
