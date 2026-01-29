'use client';

// Native Google Sign-In checklist:
// - Google Cloud Console: Android OAuth client (package name + SHA1).
// - Google Cloud Console: Web OAuth client (used as webClientId).
// - Supabase Google provider: include BOTH client IDs (comma-separated).

import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { SocialLogin } from '@capgo/capacitor-social-login';
import type { Session } from '@supabase/supabase-js';
import { getNativeSupabase } from '@/lib/supabase';

const DEFAULT_NEXT = '/app';
const OAUTH_NEXT_KEY = 'oauth_next';
const NATIVE_NONCE_KEY = 'native_google_nonce';
const NATIVE_BRIDGE_ATTEMPT_KEY = 'native_bridge_attempted';

const normalizeNext = (value: string) => (value.startsWith('/') ? value : DEFAULT_NEXT);

const safeLogSummary = (prefix: string, payload: Record<string, unknown>) => {
  console.log(prefix, JSON.stringify(payload));
};

const safeLogError = (error: unknown) => {
  const err = error as { message?: string; name?: string; code?: string };
  console.warn(
    '[native-google] error',
    JSON.stringify({
      message: err?.message ?? 'unknown',
      name: err?.name ?? 'Error',
      code: err?.code
    })
  );
};

const hasPluginAvailable = () => Capacitor.isPluginAvailable('SocialLogin');

let initialized = false;
const ensureInitialized = async () => {
  if (initialized) return;
  const webClientId = process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
  if (!webClientId) {
    throw new Error('Missing NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID.');
  }
  await SocialLogin.initialize({
    google: {
      webClientId,
      mode: 'online'
    }
  });
  initialized = true;
};

const getRandomBytes = (length: number) => {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error('Secure random generator is unavailable.');
  }
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
};

const base64UrlEncode = (bytes: Uint8Array) => {
  const binary = String.fromCharCode(...bytes);
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const generateNonce = () => base64UrlEncode(getRandomBytes(32));

const sha256Hex = async (value: string) => {
  if (!globalThis.crypto?.subtle) {
    throw new Error('SHA-256 digest is unavailable.');
  }
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  const hashArray = Array.from(new Uint8Array(digest));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
};

const extractGoogleTokens = (response: any) => {
  const result = response?.result ?? response;
  const idToken = typeof result?.idToken === 'string' ? result.idToken : null;
  const accessTokenValue = result?.accessToken;
  const accessToken = typeof accessTokenValue === 'string'
    ? accessTokenValue
    : typeof accessTokenValue?.token === 'string'
      ? accessTokenValue.token
      : null;
  return { idToken, accessToken };
};

const clearTransientKeys = async () => {
  try {
    localStorage.removeItem(OAUTH_NEXT_KEY);
    localStorage.removeItem(NATIVE_NONCE_KEY);
    localStorage.removeItem(NATIVE_BRIDGE_ATTEMPT_KEY);
  } catch {
    // ignore storage errors
  }
  try {
    sessionStorage.removeItem(OAUTH_NEXT_KEY);
    sessionStorage.removeItem(NATIVE_NONCE_KEY);
    sessionStorage.removeItem(NATIVE_BRIDGE_ATTEMPT_KEY);
  } catch {
    // ignore storage errors
  }
  try {
    await Preferences.remove({ key: OAUTH_NEXT_KEY });
    await Preferences.remove({ key: NATIVE_NONCE_KEY });
    await Preferences.remove({ key: NATIVE_BRIDGE_ATTEMPT_KEY });
  } catch {
    // ignore storage errors
  }
};

const logCookieNames = (label: string) => {
  if (process.env.NODE_ENV !== 'development' || typeof document === 'undefined') return;
  const names = document.cookie
    .split(';')
    .map((cookie) => cookie.trim().split('=')[0])
    .filter((name) => name.startsWith('sb-'));
  console.log(label, JSON.stringify({ cookieNames: names }));
};

export async function bridgeSessionToCookies(session: Session) {
  safeLogSummary('[native-google] bridge-start', {
    hasAccessToken: Boolean(session?.access_token),
    accessTokenLen: session?.access_token?.length ?? 0,
    hasRefreshToken: Boolean(session?.refresh_token),
    refreshTokenLen: session?.refresh_token?.length ?? 0
  });

  const response = await fetch('/api/auth/native-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    cache: 'no-store',
    body: JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token
    })
  });

  const payload = await response.json().catch(() => null);
  safeLogSummary('[native-google] bridge-result', {
    ok: Boolean(payload?.ok),
    hasUser: Boolean(payload?.hasUser)
  });

  if (!response.ok || !payload?.ok) {
    throw new Error('Failed to bridge native session to cookies.');
  }

  logCookieNames('[native-google] cookie-names');
}

export async function getNativeBridgeAttempted() {
  const { value } = await Preferences.get({ key: NATIVE_BRIDGE_ATTEMPT_KEY });
  return value;
}

export async function setNativeBridgeAttempted() {
  await Preferences.set({ key: NATIVE_BRIDGE_ATTEMPT_KEY, value: String(Date.now()) });
}

export async function clearNativeBridgeAttempted() {
  await Preferences.remove({ key: NATIVE_BRIDGE_ATTEMPT_KEY });
}

export async function nativeGoogleSupabaseSignIn(nextPath: string): Promise<void> {
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();
  const hasPlugin = hasPluginAvailable();
  safeLogSummary('[native-google] init', { isNative, platform, hasPlugin });

  if (!isNative || platform !== 'android') {
    throw new Error('Native Google sign-in is only supported on Android.');
  }
  if (!hasPlugin) {
    throw new Error('Native Google plugin missing. Did you run: npx cap sync android ?');
  }

  try {
    await ensureInitialized();
    const next = normalizeNext(nextPath);
    safeLogSummary('[native-google] login-start', { next });

    const rawNonce = generateNonce();
    const nonceDigest = await sha256Hex(rawNonce);
    await Preferences.set({ key: NATIVE_NONCE_KEY, value: rawNonce });

    const response = await SocialLogin.login({
      provider: 'google',
      options: {
        nonce: nonceDigest
      }
    });

    const { idToken, accessToken } = extractGoogleTokens(response);
    safeLogSummary('[native-google] login-result', { hasIdToken: Boolean(idToken), idTokenLen: idToken?.length ?? 0 });

    if (!idToken) {
      throw new Error('Missing Google idToken.');
    }

    const supabase = getNativeSupabase();
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
      nonce: rawNonce,
      access_token: accessToken || undefined
    });
    const hasSession = Boolean(data?.session);
    const hasUser = Boolean(data?.user);
    safeLogSummary('[native-google] supabase-result', { hasSession, hasUser });

    if (error || !hasSession || !data?.session) {
      throw error ?? new Error('Supabase session missing after native sign-in.');
    }

    await bridgeSessionToCookies(data.session);
    await clearTransientKeys();
    window.location.replace(next);
  } catch (error) {
    safeLogError(error);
    throw error;
  }
}

export async function nativeGoogleSupabaseSignOut(): Promise<void> {
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();
  const hasPlugin = hasPluginAvailable();
  safeLogSummary('[native-google] init', { isNative, platform, hasPlugin });

  try {
    if (hasPlugin) {
      await SocialLogin.logout({ provider: 'google' });
    }
  } catch (error) {
    safeLogError(error);
  }

  try {
    const supabase = getNativeSupabase();
    await supabase.auth.signOut();
  } catch (error) {
    safeLogError(error);
  } finally {
    try {
      await fetch('/api/auth/native-logout', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store'
      });
    } catch {
      // ignore logout bridge errors
    }
    await clearTransientKeys();
  }
}
