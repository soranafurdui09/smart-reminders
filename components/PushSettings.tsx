'use client';

import { useEffect, useState } from 'react';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushSettings({
  vapidPublicKey,
  copy
}: {
  vapidPublicKey: string;
  copy: {
    title: string;
    subtitle: string;
    activate: string;
    deactivate: string;
    enabling: string;
    disabling: string;
    enabled: string;
    disabled: string;
    notSupported: string;
    androidBlocked: string;
  };
}) {
  const [status, setStatus] = useState<string>('');
  const [canUseWebPush, setCanUseWebPush] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch('/api/me/notification-capabilities', { credentials: 'include' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!mounted) return;
        if (data && typeof data.can_use_web_push === 'boolean') {
          setCanUseWebPush(data.can_use_web_push);
        } else {
          setCanUseWebPush(true);
        }
      })
      .catch(() => setCanUseWebPush(true));
    return () => {
      mounted = false;
    };
  }, []);

  const handleSubscribe = async () => {
    if (canUseWebPush === false) {
      setStatus(copy.androidBlocked);
      return;
    }
    setStatus(copy.enabling);
    if (!('serviceWorker' in navigator)) {
      setStatus(copy.notSupported);
      return;
    }
    const registration = await navigator.serviceWorker.register('/sw.js');
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    });
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription)
    });
    setStatus(copy.enabled);
  };

  const handleUnsubscribe = async () => {
    if (canUseWebPush === false) {
      setStatus(copy.androidBlocked);
      return;
    }
    setStatus(copy.disabling);
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint })
      });
      await subscription.unsubscribe();
    }
    setStatus(copy.disabled);
  };

  return (
    <div className="card space-y-4">
      <div>
        <div className="text-lg font-semibold text-ink">{copy.title}</div>
        <p className="text-sm text-muted">{copy.subtitle}</p>
      </div>
      {canUseWebPush === false ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          {copy.androidBlocked}
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          <button className="btn btn-primary" onClick={handleSubscribe} type="button">{copy.activate}</button>
          <button className="btn btn-secondary" onClick={handleUnsubscribe} type="button">{copy.deactivate}</button>
        </div>
      )}
      {status ? <div className="text-sm text-muted">{status}</div> : null}
    </div>
  );
}
