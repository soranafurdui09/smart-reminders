// app/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/lib/supabase/types';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/app';

  if (!code) {
    url.pathname = '/auth';
    url.searchParams.delete('code');
    return NextResponse.redirect(url);
  }

  const response = NextResponse.redirect(new URL(next, url.origin));

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: Parameters<typeof response.cookies.set>[0]) {
          const cookieOptions = (typeof options === 'object' && options) ? options : {};
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
