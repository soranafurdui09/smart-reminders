'use client';

// Native Google Sign-In checklist:
// - Google Cloud Console: Android OAuth client (package name + SHA1).
// - Google Cloud Console: Web OAuth client (used as webClientId).
// - Supabase Google provider: include BOTH client IDs (comma-separated).

import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';

const DEFAULT_NEXT = '/app';

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

export async function nativeGoogleSupabaseSignIn(nextPath: string): Promise<{ ok: true; next: string }> {
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

    const response = await SocialLogin.login({
      provider: 'google',
      options: {
        nonce: nonceDigest
      }
    });

    const { idToken } = extractGoogleTokens(response);
    safeLogSummary('[native-google] login-result', {
      hasIdToken: Boolean(idToken),
      idTokenLen: idToken?.length ?? 0,
      hasNonce: Boolean(rawNonce),
      nonceLen: rawNonce.length
    });

    if (!idToken) {
      throw new Error('Missing Google idToken.');
    }

    const responseSession = await fetch('/api/auth/native-idtoken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      cache: 'no-store',
      body: JSON.stringify({
        idToken,
        nonce: rawNonce,
        next
      })
    });

    safeLogSummary('[native-google] native-idtoken', {
      status: responseSession.status
    });

    if (!responseSession.ok) {
      throw new Error('Native idToken sign-in failed.');
    }

    return { ok: true, next };
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
    await fetch('/logout', {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store'
    });
  } catch (error) {
    safeLogError(error);
  }
}
