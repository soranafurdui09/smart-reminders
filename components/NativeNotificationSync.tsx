'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  cancelAllScheduled,
  isNativeAndroidApp,
  requestPermissionsIfNeeded,
  resync,
  sendHeartbeat,
  setupNotificationTap,
  setupResumeSync
} from '@/lib/native/localNotifications';

export default function NativeNotificationSync() {
  const pathname = usePathname();
  const router = useRouter();
  const initializedRef = useRef(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    if (!isNativeAndroidApp()) return;
    if (initializedRef.current) return;
    initializedRef.current = true;
    setupNotificationTap((url) => router.push(url));
    setupResumeSync();
    requestPermissionsIfNeeded()
      .then(async (granted) => {
        setPermissionDenied(!granted);
        await sendHeartbeat(true);
        if (granted) {
          await resync(7, true);
        }
      })
      .catch((error) => {
        console.error('[native] notification init failed', error);
      });
  }, [router]);

  useEffect(() => {
    if (!isNativeAndroidApp()) return;
    resync(7).catch((error) => {
      console.error('[native] resync failed', error);
    });
  }, [pathname]);

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
