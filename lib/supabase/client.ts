import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr';
import type { Database } from './types';
import { getPublicEnvStatus, getRequiredPublicEnv, getSupabaseStorageKey } from '@/lib/env';

type CookieOptions = {
  path?: string;
  maxAge?: number;
  expires?: Date;
  sameSite?: 'lax' | 'strict' | 'none';
  secure?: boolean;
  domain?: string;
};

function getCookie(name: string) {
  if (typeof document === 'undefined') {
    return undefined;
  }
  const value = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith(`${name}=`))
    ?.split('=')
    .slice(1)
    .join('=');
  return value ? decodeURIComponent(value) : undefined;
}

function setCookie(name: string, value: string, options: CookieOptions = {}) {
  if (typeof document === 'undefined') {
    return;
  }
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${options.path ?? '/'}`);
  if (options.maxAge != null) {
    parts.push(`Max-Age=${options.maxAge}`);
  }
  if (options.expires) {
    parts.push(`Expires=${options.expires.toUTCString()}`);
  }
  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`);
  }
  if (options.secure) {
    parts.push('Secure');
  }
  if (options.domain) {
    parts.push(`Domain=${options.domain}`);
  }
  document.cookie = parts.join('; ');
}

export function createBrowserClient() {
  const envStatus = getPublicEnvStatus();
  if (!envStatus.ok) {
    throw new Error(`Missing env vars: ${envStatus.missing.join(', ')}`);
  }

  const storageKey = getSupabaseStorageKey();
  const shouldManageCookie = (name: string) => {
    if (!storageKey) {
      return true;
    }
    if (name.includes(`${storageKey}-code-verifier`)) {
      return true;
    }
    return !name.startsWith(storageKey);
  };

  return createSupabaseBrowserClient<Database>(
    getRequiredPublicEnv('NEXT_PUBLIC_SUPABASE_URL'),
    getRequiredPublicEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      auth: {
        storageKey
      },
      cookies: {
        get(name: string) {
          if (!shouldManageCookie(name)) {
            return undefined;
          }
          return getCookie(name);
        },
        set(name: string, value: string, options: CookieOptions) {
          const cookieOptions = typeof options === 'object' && options ? options : {};
          if (!shouldManageCookie(name)) {
            return;
          }
          setCookie(name, value, cookieOptions);
        },
        remove(name: string, options: CookieOptions) {
          const cookieOptions = typeof options === 'object' && options ? options : {};
          if (!shouldManageCookie(name)) {
            return;
          }
          setCookie(name, '', { ...cookieOptions, maxAge: 0 });
        }
      }
    }
  );
}
