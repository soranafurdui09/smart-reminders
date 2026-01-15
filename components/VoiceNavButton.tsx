"use client";

import { useCallback } from 'react';
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
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach((track) => track.stop());
        } catch {
          // Ignore warm-up errors; permission prompt will be handled on the next page.
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
