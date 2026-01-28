"use client";

// OAuth invariant: native Android must use the Preferences-backed client for both PKCE start/exchange.
// Mixing web/native clients breaks PKCE state and causes "invalid flow state" errors.

import { useEffect, useRef } from 'react';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { useRouter } from 'next/navigation';
import { getNativeSupabase, NATIVE_AUTH_STORAGE_KEY } from '@/lib/supabase/native';

const CALLBACK_PREFIX = 'com.smartreminder.app://auth/callback';
const handledDeepLinkUrls = new Set<string>();
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

const logNativeAuthStorageState = async (label: string) => {
  try {
    const keys = [
      NATIVE_AUTH_STORAGE_KEY,
      `${NATIVE_AUTH_STORAGE_KEY}-code-verifier`,
      `${NATIVE_AUTH_STORAGE_KEY}-oauth-state`,
      OAUTH_NEXT_KEY
    ];
    const results = await Promise.all(
      keys.map(async (key) => {
        const { value } = await Preferences.get({ key });
        return { key, present: value !== null, len: value?.length ?? 0 };
      })
    );
    console.log(label, JSON.stringify({ keys: results }));
  } catch (error) {
    console.warn(label, 'native storage dump failed', error);
  }
};

const readNextFromPreferences = async () => {
  const { value } = await Preferences.get({ key: OAUTH_NEXT_KEY });
  return normalizeNext(value);
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
        const code = incoming.searchParams.get('code');
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
        await logNativeAuthStorageState('[oauth][native][storage] before exchange');

        if (errorParam) {
          console.warn('[oauth] callback error', JSON.stringify({ error: errorParam, errorDescription }));
          return;
        }
        if (!code || !state) {
          console.warn('[oauth] missing code/state in callback, skipping exchange', JSON.stringify({
            hasCode: Boolean(code),
            hasState: Boolean(state),
            queryKeys: Array.from(incoming.searchParams.keys())
          }));
          return;
        }

        console.log('[oauth] client=native');
        const supabase = getNativeSupabase();
        const { error } = await supabase.auth.exchangeCodeForSession(url);
        if (error) {
          console.warn('[oauth] exchangeCodeForSession failed', error);
          const reason = encodeURIComponent((error.message || 'unknown').slice(0, 120));
          router.replace(`/auth?error=oauth_exchange_failed&reason=${reason}`);
          return;
        } else {
          await logNativeAuthStorageState('[oauth][native][storage] after exchange');
        }
        const { data } = await supabase.auth.getSession();
        console.log('[oauth] getSession', JSON.stringify({ hasSession: Boolean(data?.session) }));
        const next = await readNextFromPreferences();
        await Preferences.remove({ key: OAUTH_NEXT_KEY });
        router.replace(next);
      } catch (error) {
        console.warn('[oauth] handleUrl failed', error);
      } finally {
        handledDeepLinkUrls.add(url);
        console.log('[oauth] Browser.close');
        await Browser.close().catch(() => undefined);
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
      const supabase = getNativeSupabase();
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
