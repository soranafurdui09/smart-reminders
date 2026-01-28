"use client";

// OAuth invariant: native Android must use the browser client in the WebView for PKCE start/exchange.
// Mixing storage contexts breaks PKCE state and causes "invalid flow state" errors.

import { useEffect, useRef } from 'react';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';
import { listSbCookieNames, maskUrlForLog, summarizeUrl } from '@/lib/auth/oauthDebug';

const CALLBACK_PREFIX = 'com.smartreminder.app://auth/complete';
const DEFAULT_NEXT = '/app';

const normalizeNext = (value?: string | null) => {
  if (!value) return DEFAULT_NEXT;
  return value.startsWith('/') ? value : DEFAULT_NEXT;
};

const handledDeepLinkUrls = new Set<string>();

const closeBrowserSafely = async () => {
  try {
    await Browser.close();
  } catch {
    // swallow
  }
  setTimeout(() => {
    void Browser.close().catch(() => undefined);
  }, 300);
  setTimeout(() => {
    void Browser.close().catch(() => undefined);
  }, 900);
};

export default function NativeOAuthListener() {
  const router = useRouter();
  const listenerAttached = useRef(false);
  const removeListenerRef = useRef<Promise<{ remove: () => void }> | null>(null);
  const handlingRef = useRef(false);
  const authListenerAttached = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isNative = Capacitor.isNativePlatform();
    const platform = Capacitor.getPlatform();
    const ua = navigator.userAgent || '';
    console.log('[oauth] listener mount', JSON.stringify({ isNative, platform, href: window.location.href, ua }));

    if (!isNative) return;

    const handleUrl = async (url: string, source: 'appUrlOpen' | 'getLaunchUrl') => {
      const summary = summarizeUrl(url);
      let nextForLog: string | null = null;
      if (summary.hasNext) {
        try {
          nextForLog = new URL(url).searchParams.get('next');
        } catch {
          nextForLog = null;
        }
      }
      console.log('[deeplink][RAW]', maskUrlForLog(url));
      console.log('[deeplink][SUMMARY]', JSON.stringify({ ...summary, next: nextForLog }));
      console.log(`[oauth] ${source} url=`, maskUrlForLog(url));
      if (!url || !url.startsWith(CALLBACK_PREFIX)) return;
      if (handledDeepLinkUrls.has(url)) {
        console.log('[oauth] deep link already handled, skip');
        return;
      }
      if (handlingRef.current) {
        console.log('[oauth] already handling, skip');
        return;
      }

      handlingRef.current = true;
      let next = DEFAULT_NEXT;
      try {
        const incoming = new URL(url);
        const rawNext = incoming.searchParams.get('next');
        next = normalizeNext(rawNext);
      } catch (error) {
        console.warn('[oauth] handleUrl failed', error);
      } finally {
        handledDeepLinkUrls.add(url);
        console.log('[oauth] Browser.close');
        await closeBrowserSafely();
        console.log('[deeplink][COOKIES]', JSON.stringify(listSbCookieNames()));
        router.replace(next);
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

    if (!authListenerAttached.current) {
      authListenerAttached.current = true;
      const supabase = getBrowserClient();
      supabase.auth.onAuthStateChange((event, session) => {
        console.log('[oauth] auth state', JSON.stringify({ event, hasSession: Boolean(session) }));
      });
    }

    // appStateChange Browser.close disabled to avoid racing OAuth exchange.

    return () => {
      removeListenerRef.current?.then((handler) => handler.remove());
      removeListenerRef.current = null;
      listenerAttached.current = false;
    };
  }, [router]);

  return null;
}
