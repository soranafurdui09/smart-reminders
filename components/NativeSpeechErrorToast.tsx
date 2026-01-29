"use client";

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';

const resolveMessage = (code: string) => {
  switch (code) {
    case 'not-allowed':
      return 'Permite accesul la microfon pentru dictare vocală.';
    case 'not-supported':
      return 'Dictarea vocală nu este disponibilă pe acest dispozitiv.';
    case 'plugin-missing':
      return 'Plugin-ul de dictare lipsește. Rulează: npx cap sync android.';
    case 'no-speech':
      return 'Nu s-a detectat niciun sunet. Încearcă din nou.';
    case 'too-short':
      return 'Dictarea este prea scurtă. Încearcă din nou.';
    case 'start-failed':
      return 'Nu am putut porni dictarea. Încearcă din nou.';
    default:
      return 'Dictarea vocală a eșuat. Încearcă din nou.';
  }
};

export default function NativeSpeechErrorToast() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isNativeAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
    if (!isNativeAndroid) return;

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ code?: string }>).detail;
      const code = detail?.code ?? 'unknown';
      setMessage(resolveMessage(code));
      window.setTimeout(() => {
        setMessage(null);
      }, 3200);
    };

    window.addEventListener('native-speech-error', handler as EventListener);
    return () => window.removeEventListener('native-speech-error', handler as EventListener);
  }, []);

  if (!message) return null;

  return (
    <div className="fixed bottom-24 left-1/2 z-50 w-[min(90vw,380px)] -translate-x-1/2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 shadow-lg">
      {message}
    </div>
  );
}
