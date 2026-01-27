"use client";

import { useEffect, useRef } from 'react';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/browserClient';

const CALLBACK_PREFIX = 'com.smartreminder.app://auth/callback';

const logStorageState = (label: string) => {
  if (typeof window === 'undefined') return;
  try {
    const lsKeys = Object.keys(localStorage).filter((k) => /sb-|supabase|pkce|oauth/i.test(k));
    const lsInfo = lsKeys.map((k) => ({ k, len: (localStorage.getItem(k) || '').length }));
    const codeVerifierKeys = Object.keys(localStorage).filter((k) => /code-verifier/i.test(k));
    const codeVerifierInfo = codeVerifierKeys.map((k) => ({ k, len: (localStorage.getItem(k) || '').length }));
    const cookieNames = document.cookie
      .split(';')
      .map((c) => c.trim().split('=')[0])
      .filter((n) => /sb-|supabase/i.test(n));
    console.log(label, { lsInfo, codeVerifierInfo, cookieNames });
  } catch (error) {
    console.warn(label, 'storage dump failed', error);
  }
};

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
        const code = incoming.searchParams.get('code');
        const state = incoming.searchParams.get('state');
        const errorParam = incoming.searchParams.get('error');
        console.log('[oauth] callback params', {
          hasCode: Boolean(code),
          codeLen: code?.length ?? 0,
          hasState: Boolean(state),
          stateLen: state?.length ?? 0,
          error: errorParam
        });
        if (!code) {
          console.warn('[oauth] missing code in callback, skipping exchange');
          return;
        }
        const next = incoming.searchParams.get('next') ?? '/app';
        logStorageState('[oauth][storage] before exchange');
        const supabase = getBrowserClient();
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
