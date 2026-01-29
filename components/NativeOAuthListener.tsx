"use client";

// OAuth invariant: native Android Google sign-in uses native ID token + Supabase signInWithIdToken.
// Deep link PKCE callbacks are logged but not exchanged here.

import { useEffect, useRef } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

const CALLBACK_PREFIX = 'com.smartreminder.app://auth/callback';

const maskDeepLinkForLog = (rawUrl: string) => {
  const fallback = () => {
    const maskedUrl = rawUrl.replace(/([?&](code|state)=)[^&]*/gi, (match) => {
      const prefix = match.split('=')[0];
      return `${prefix}=<redacted>`;
    });
    return {
      maskedUrl,
      summary: {
        hasCode: /[?&]code=/i.test(rawUrl),
        codeLen: 0,
        hasState: /[?&]state=/i.test(rawUrl),
        stateLen: 0,
        paramKeys: [] as string[],
        error: null as string | null,
        errorDesc: null as string | null,
        next: null as string | null
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

    return {
      maskedUrl: `${url.protocol}//${url.host}${url.pathname}?${maskedParams.toString()}`,
      summary: {
        hasCode: Boolean(code),
        codeLen: code?.length ?? 0,
        hasState: Boolean(state),
        stateLen: state?.length ?? 0,
        paramKeys,
        error,
        errorDesc,
        next
      }
    };
  } catch {
    return fallback();
  }
};

const handledDeepLinkUrls = new Set<string>();

export default function NativeOAuthListener() {
  const listenerAttached = useRef(false);
  const removeListenerRef = useRef<Promise<{ remove: () => void }> | null>(null);
  const handlingRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isNative = Capacitor.isNativePlatform();
    const platform = Capacitor.getPlatform();
    const ua = navigator.userAgent || '';
    console.log('[oauth] listener mount', JSON.stringify({ isNative, platform, href: window.location.href, ua }));

    if (!isNative) return;

    const handleUrl = async (url: string, source: 'appUrlOpen' | 'getLaunchUrl') => {
      const dumped = maskDeepLinkForLog(url);
      console.log('[deeplink][RAW]', dumped.maskedUrl);
      console.log('[deeplink][SUMMARY]', JSON.stringify(dumped.summary));
      console.log(`[oauth] ${source} url=`, dumped.maskedUrl);
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
        console.warn('[oauth] deep link callback ignored; native Google sign-in uses ID token flow');
      } catch (error) {
        console.warn('[oauth] handleUrl failed', error);
      } finally {
        handledDeepLinkUrls.add(url);
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

    // appStateChange Browser.close disabled to avoid racing OAuth exchange.

    return () => {
      removeListenerRef.current?.then((handler) => handler.remove());
      removeListenerRef.current = null;
      listenerAttached.current = false;
    };
  }, []);

  return null;
}
