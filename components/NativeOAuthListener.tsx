"use client";

// OAuth invariant: native Android must use the browser client in the WebView for PKCE start/exchange.
// Mixing storage contexts breaks PKCE state and causes "invalid flow state" errors.

import { useEffect, useRef } from 'react';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';

const CALLBACK_PREFIX = 'com.smartreminder.app://auth/callback';
const OAUTH_NEXT_KEY = 'oauth_next';
const DEFAULT_NEXT = '/app';

const maskUrlForLog = (url: string) => {
  try {
    const u = new URL(url);
    const params = new URLSearchParams(u.search);
    ['access_token', 'refresh_token', 'code'].forEach((key) => {
      const value = params.get(key);
      if (value) {
        params.set(key, `<redacted:${value.length}>`);
      }
    });
    return `${u.protocol}//${u.host}${u.pathname}?${params.toString()}`;
  } catch {
    return '<invalid-url>';
  }
};

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
      try {
        const incoming = new URL(url);
        const code = incoming.searchParams.get('code')?.replace(/#$/, '');
        const state = incoming.searchParams.get('state');
        const errorParam = incoming.searchParams.get('error');
        const errorDescription = incoming.searchParams.get('error_description');
        console.log('[oauth] callback params', JSON.stringify({
          hasCode: Boolean(code),
          codeLen: code?.length ?? 0,
          hasState: Boolean(state),
          stateLen: state?.length ?? 0,
          error: errorParam
        }));

        if (errorParam) {
          console.warn('[oauth] callback error', JSON.stringify({ error: errorParam, errorDescription }));
          return;
        }
        if (!code || !state) {
          console.warn('[oauth] missing code/state in callback, skipping exchange', JSON.stringify({
            hasCode: Boolean(code),
            hasState: Boolean(state),
            queryKeys: Array.from(incoming.searchParams.keys()),
            maskedUrl: maskUrlForLog(url)
          }));
          return;
        }

        console.log('[oauth] client=web');
        console.log('[oauth] exchange start');
        const supabase = getBrowserClient();
        const { error } = await supabase.auth.exchangeCodeForSession(url);
        if (error) {
          console.warn('[oauth] exchangeCodeForSession failed', error);
          return;
        }
        const { data } = await supabase.auth.getSession();
        const session = data?.session ?? null;
        console.log('[oauth] getSession', JSON.stringify({
          hasSession: Boolean(session)
        }));
        console.log('[oauth] exchange done');
        const rawNext = localStorage.getItem(OAUTH_NEXT_KEY) ?? DEFAULT_NEXT;
        const next = normalizeNext(rawNext);
        localStorage.removeItem(OAUTH_NEXT_KEY);
        router.replace(next);
      } catch (error) {
        console.warn('[oauth] handleUrl failed', error);
      } finally {
        handledDeepLinkUrls.add(url);
        console.log('[oauth] Browser.close');
        await closeBrowserSafely();
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
