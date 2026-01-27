"use client";

import { useEffect, useRef } from 'react';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';

const CALLBACK_PREFIX = 'com.smartreminder.app://auth/callback';

export default function NativeOAuthListener() {
  const router = useRouter();
  const listenerAttached = useRef(false);
  const removeListenerRef = useRef<Promise<{ remove: () => void }> | null>(null);
  const handlingRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isNative = Capacitor.isNativePlatform();
    const platform = Capacitor.getPlatform();
    const ua = navigator.userAgent || '';
    console.log('[oauth] listener mount', { isNative, platform, href: window.location.href, ua });

    if (!isNative) return;

    const handleUrl = async (url: string, source: 'appUrlOpen' | 'getLaunchUrl') => {
      try {
        console.log(`[oauth] ${source} url=`, url);
        if (!url || !url.startsWith(CALLBACK_PREFIX)) return;
        if (handlingRef.current) {
          console.log('[oauth] already handling, skip');
          return;
        }
        handlingRef.current = true;
        const incoming = new URL(url);
        const next = incoming.searchParams.get('next') ?? '/app';
        const supabase = createBrowserClient();
        try {
          const { error } = await supabase.auth.exchangeCodeForSession(url);
          if (error) {
            console.warn('[oauth] exchangeCodeForSession failed', error);
          }
        } finally {
          console.log('[oauth] Browser.close');
          await Browser.close().catch(() => undefined);
        }
        router.replace(next || '/app');
      } catch (error) {
        console.warn('[oauth] handleUrl failed', error);
      } finally {
        handlingRef.current = false;
      }
    };

    if (!listenerAttached.current) {
      listenerAttached.current = true;
      const removeListener = App.addListener('appUrlOpen', (event) => {
        void handleUrl(event.url, 'appUrlOpen');
      });
      removeListenerRef.current = removeListener;
    }

    App.getLaunchUrl()
      .then((result) => {
        if (result?.url) {
          void handleUrl(result.url, 'getLaunchUrl');
        } else {
          console.log('[oauth] getLaunchUrl url= <none>');
        }
      })
      .catch((error) => {
        console.warn('[oauth] getLaunchUrl failed', error);
      });

    return () => {
      removeListenerRef.current?.then((handler) => handler.remove());
      removeListenerRef.current = null;
      listenerAttached.current = false;
    };
  }, [router]);

  return null;
}
