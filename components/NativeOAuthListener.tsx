"use client";

// OAuth invariant: native Android must use the Preferences-backed client for both PKCE start/exchange.
// Mixing web/native clients breaks PKCE state and causes "invalid flow state" errors.

import { useEffect, useRef } from 'react';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { useRouter } from 'next/navigation';
import { dumpPrefs, getNativeSupabase } from '@/lib/supabase/nativeClient';

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

const readNextFromPreferences = async () => {
  const { value } = await Preferences.get({ key: OAUTH_NEXT_KEY });
  return normalizeNext(value);
};

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
  const lastHandledCodeRef = useRef<string | null>(null);

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
        await dumpPrefs('[oauth][native][prefs] before exchange');

        if (errorParam) {
          console.warn('[oauth] callback error', JSON.stringify({ error: errorParam, errorDescription }));
          return;
        }
        if (!code) {
          console.warn('[oauth] missing code in callback, skipping exchange', JSON.stringify({
            hasCode: Boolean(code),
            queryKeys: Array.from(incoming.searchParams.keys())
          }));
          return;
        }
        if (lastHandledCodeRef.current === code) {
          console.log('[oauth] code already handled, skip');
          return;
        }
        lastHandledCodeRef.current = code;

        console.log('[oauth] client=native');
        const supabase = getNativeSupabase();
        // exchangeCodeForSession is called with CODE ONLY; state is not required for callback handling.
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.warn('[oauth] exchangeCodeForSession failed', error);
          return;
        }
        await dumpPrefs('[oauth][native][prefs] after exchange');
        const { data } = await supabase.auth.getSession();
        const session = data?.session ?? null;
        console.log('[oauth] getSession', JSON.stringify({
          hasSession: Boolean(session),
          accessLen: session?.access_token?.length ?? 0,
          refreshLen: session?.refresh_token?.length ?? 0
        }));
        if (session?.access_token && session?.refresh_token) {
          await supabase.auth.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token
          });
        }
        const next = await readNextFromPreferences();
        await Preferences.remove({ key: OAUTH_NEXT_KEY });
        router.replace(next);
      } catch (error) {
        console.warn('[oauth] handleUrl failed', error);
      } finally {
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
