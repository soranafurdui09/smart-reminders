"use client";

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  href: string;
  label: string;
  title: string;
  className?: string;
  children: React.ReactNode;
};

const HANDOFF_KEY = 'voice_handoff_ts';

export default function VoiceNavButton({ href, label, title, className, children }: Props) {
  const router = useRouter();

  useEffect(() => {
    router.prefetch(href);
  }, [href, router]);

  const handleClick = useCallback(
    async (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      if (typeof window !== 'undefined') {
        try {
          window.sessionStorage.setItem(HANDOFF_KEY, String(Date.now()));
        } catch {
          // Ignore storage issues; we still want to navigate.
        }
      }
      router.push(href);
    },
    [href, router]
  );

  return (
    <button
      type="button"
      className={className}
      onClick={handleClick}
      aria-label={label}
      title={title}
    >
      {children}
    </button>
  );
}
