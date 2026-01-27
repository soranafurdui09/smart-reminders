// app/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/lib/supabase/types';
import { getRequiredEnv, getSupabaseServerUrl, getSupabaseStorageKey } from '@/lib/env';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/app';
  const native = url.searchParams.get('native');
  const userAgent = request.headers.get('user-agent') || '';

  if (native === '1' && /Android/i.test(userAgent)) {
    const deepLink = new URL('com.smartreminder.app://auth/callback');
    url.searchParams.forEach((value, key) => {
      deepLink.searchParams.set(key, value);
    });
    console.log('[auth/callback] native=1 bounce to deep link', deepLink.toString());
    return NextResponse.redirect(deepLink);
  }

  if (!code) {
    url.pathname = '/auth';
    url.searchParams.delete('code');
    return NextResponse.redirect(url);
    
  }

  const response = NextResponse.redirect(new URL(next, url.origin));
  const storageKey = getSupabaseStorageKey();

  const supabase = createServerClient<Database>(
    getSupabaseServerUrl(),
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      auth: storageKey ? { storageKey } : undefined,
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: Parameters<typeof response.cookies.set>[0]) {
          const cookieOptions = typeof options === 'object' && options ? options : {};
          response.cookies.set({ name, value, ...cookieOptions });
        },
        remove(name: string, options: Parameters<typeof response.cookies.set>[0]) {
          const cookieOptions = (typeof options === 'object' && options) ? options : {};
          response.cookies.set({ name, value: '', ...cookieOptions, maxAge: 0 });
        }
      }
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession failed', error);
    const errUrl = new URL('/auth', url.origin);
    errUrl.searchParams.set('error', 'callback-failed');
    return NextResponse.redirect(errUrl);
  }

  return response;
}
