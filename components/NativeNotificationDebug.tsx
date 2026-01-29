"use client";

import { useEffect, useState } from 'react';
import {
  getNotificationPermissionStatus,
  isNativeAndroidApp,
  requestPermissionsIfNeeded,
  scheduleTestNotification
} from '@/lib/native/localNotifications';

export default function NativeNotificationDebug() {
  const [status, setStatus] = useState<string | null>(null);
  const [permission, setPermission] = useState<string>('unknown');

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (!isNativeAndroidApp()) return;
    getNotificationPermissionStatus()
      .then((next) => setPermission(next))
      .catch(() => setPermission('unknown'));
  }, []);

  if (process.env.NODE_ENV === 'production') return null;
  if (!isNativeAndroidApp()) return null;

  const handleTest = async () => {
    setStatus(null);
    try {
      const granted = await requestPermissionsIfNeeded();
      if (!granted) {
        setStatus('Permisiunea pentru notificări este dezactivată.');
        setPermission('denied');
        return;
      }
      await scheduleTestNotification();
      setPermission('granted');
      setStatus('Notificare programată pentru 5s.');
    } catch (error) {
      console.error('[native] test notification failed', error);
      setStatus('Testul de notificare a eșuat.');
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
      <div className="font-semibold">Debug (native)</div>
      <div className="mt-1 text-[11px] text-slate-500">Notifications: {permission}</div>
      <button
        type="button"
        className="mt-2 inline-flex w-full items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
        onClick={handleTest}
      >
        Test notification (5s)
      </button>
      {status ? <div className="mt-2 text-xs text-slate-600">{status}</div> : null}
    </div>
  );
}
