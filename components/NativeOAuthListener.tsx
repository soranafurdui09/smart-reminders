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

const maskDeepLinkForShare = (rawUrl: string) => {
  const fallback = () => {
    const masked = rawUrl
      .replace(/([?&]code=)[^&]*/i, (_match, prefix) => `${prefix}<redacted>`)
      .replace(/([?&]state=)[^&]*/i, (_match, prefix) => `${prefix}<redacted>`);
    return {
      maskedUrl: masked,
      summary: {
        hasCode: /[?&]code=/i.test(rawUrl),
        codeLen: 0,
        hasState: /[?&]state=/i.test(rawUrl),
        stateLen: 0,
        error: null as string | null,
        errorDesc: null as string | null,
        next: null as string | null,
        paramKeys: [] as string[]
      }
    };
  };

  try {
    const url = new URL(rawUrl);
    const params = new URLSearchParams(url.search);
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');
    const errorDesc = params.get('error_description');
    const next = params.get('next');
    const paramKeys = Array.from(params.keys());

    const maskedParams = new URLSearchParams(params);
    if (code) maskedParams.set('code', `<redacted:${code.length}>`);
    if (state) maskedParams.set('state', `<redacted:${state.length}>`);

    for (const [key, value] of maskedParams.entries()) {
      if (value.length > 200) {
        maskedParams.set(key, `<len:${value.length}>`);
      }
    }

    return {
      maskedUrl: `${url.protocol}//${url.host}${url.pathname}?${maskedParams.toString()}`,
      summary: {
        hasCode: Boolean(code),
        codeLen: code?.length ?? 0,
        hasState: Boolean(state),
        stateLen: state?.length ?? 0,
        error,
        errorDesc,
        next,
        paramKeys
      }
    };
  } catch {
    return fallback();
  }
};

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
      const dumped = maskDeepLinkForShare(url);
      console.log('[deeplink][RAW]', dumped.maskedUrl);
      console.log('[deeplink][SUMMARY]', JSON.stringify(dumped.summary));
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
