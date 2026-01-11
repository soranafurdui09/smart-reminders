import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { EmailOtpType } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import { getRequiredEnv, getSupabaseServerUrl, getSupabaseStorageKey } from '@/lib/env';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const token = searchParams.get('token');
  const type = searchParams.get('type');
  const next = searchParams.get('next') ?? '/app';

  if (!code && !token) {
    return NextResponse.redirect(new URL('/auth', getSafeOrigin(request)));
  }

  const safeOrigin = getSafeOrigin(request);
  const response = NextResponse.redirect(new URL(next.startsWith('/') ? next : '/app', safeOrigin));
  const supabase = createServerClient<Database>(
    getSupabaseServerUrl(),
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      auth: {
        storageKey: getSupabaseStorageKey()
      },
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: Parameters<typeof response.cookies.set>[0]) {
          const cookieOptions = typeof options === 'object' && options ? options : {};
          response.cookies.set({ name, value, ...cookieOptions });
        },
        remove(name: string, options: Parameters<typeof response.cookies.set>[0]) {
          const cookieOptions = typeof options === 'object' && options ? options : {};
          response.cookies.set({ name, value: '', ...cookieOptions, maxAge: 0 });
        }
      }
    }
  );

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('[auth] exchangeCodeForSession failed', error);
      const fallback = await supabase.auth.exchangeCodeForSession(request.url);
      if (fallback.error) {
        console.error('[auth] exchangeCodeForSession fallback failed', fallback.error);
        return NextResponse.redirect(new URL('/auth?error=callback-failed', safeOrigin));
      }
    }
  } else if (token) {
    const otpType = (type || 'magiclink') as EmailOtpType;
    const { error } = await supabase.auth.verifyOtp({ token, type: otpType });
    if (error) {
      console.error('[auth] verifyOtp failed', error);
      return NextResponse.redirect(new URL('/auth?error=callback-failed', safeOrigin));
    }
  }

  return response;
}

function getSafeOrigin(request: NextRequest) {
  const url = new URL(request.url);
  const safeHost = url.hostname === '0.0.0.0' || url.hostname === '::' || url.hostname === '[::]'
    ? 'localhost'
    : url.hostname;
  return `${url.protocol}//${safeHost}${url.port ? `:${url.port}` : ''}`;
}
