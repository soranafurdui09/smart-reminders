'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import {
  cancelAllScheduled,
  isNativeAndroidApp,
  requestPermissionsIfNeeded,
  resync,
  sendHeartbeat,
  setupNotificationTap
} from '@/lib/native/localNotifications';

export default function NativeNotificationSync() {
  const pathname = usePathname();
  const router = useRouter();
  const initializedRef = useRef(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const lastResyncRef = useRef(0);
  const DEV = process.env.NODE_ENV !== 'production';
  const RESYNC_COOLDOWN_MS = 10 * 60 * 1000;

  const runResync = useCallback(
    async (reason: 'mount' | 'resume' | 'path') => {
      if (!isNativeAndroidApp()) return;
      const now = Date.now();
      if (now - lastResyncRef.current < RESYNC_COOLDOWN_MS) {
        return;
      }
      lastResyncRef.current = now;
      if (DEV) console.time(`[native] resync:${reason}`);
      try {
        await resync(7, true);
      } finally {
        if (DEV) console.timeEnd(`[native] resync:${reason}`);
      }
    },
    [DEV]
  );

  useEffect(() => {
    if (!isNativeAndroidApp()) return;
    if (initializedRef.current) return;
    initializedRef.current = true;
    setupNotificationTap((url) => router.push(url));
    requestPermissionsIfNeeded()
      .then(async (granted) => {
        setPermissionDenied(!granted);
        await sendHeartbeat(true);
        if (granted) {
          await runResync('mount');
        }
      })
      .catch((error) => {
        console.error('[native] notification init failed', error);
      });
  }, [router, runResync]);

  useEffect(() => {
    if (isNativeAndroidApp()) {
      const isNative = Capacitor.isNativePlatform();
      if (!isNative) return;
      const handler = App.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) return;
        void runResync('resume');
      });
      return () => {
        handler.then((sub) => sub.remove());
      };
    }
    resync(7).catch((error) => {
      console.error('[native] resync failed', error);
    });
  }, [pathname, runResync]);

  useEffect(() => {
    if (!isNativeAndroidApp()) return;
    const handleChange = () => {
      resync(7, true).catch((error) => {
        console.error('[native] resync failed', error);
      });
    };
    window.addEventListener('reminder:changed', handleChange);
    return () => window.removeEventListener('reminder:changed', handleChange);
  }, []);

  useEffect(() => {
    if (!isNativeAndroidApp()) return;
    const handleSubmit = (event: Event) => {
      const form = event.target as HTMLFormElement | null;
      if (!form?.action) return;
      if (form.action.includes('/logout')) {
        cancelAllScheduled().catch((error) => {
          console.error('[native] cancel notifications failed', error);
        });
      }
    };
    document.addEventListener('submit', handleSubmit, true);
    return () => document.removeEventListener('submit', handleSubmit, true);
  }, []);

  if (!permissionDenied) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-40 w-[min(92vw,420px)] -translate-x-1/2 rounded-2xl border border-slate-200 bg-white/95 p-4 text-xs text-slate-700 shadow-lg backdrop-blur">
      Notificarile locale sunt dezactivate. Activeaza permisiunile pentru a primi alerte in timp real.
    </div>
  );
}
