import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/lib/supabase/types';
import { getRequiredEnv, getSupabaseServerUrl, getSupabaseStorageKey } from '@/lib/env';
import { getRequestOrigin, getSafeNextPath } from '@/lib/http';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = getSafeNextPath(searchParams.get('next'));
  const origin = getRequestOrigin();

  if (!code) {
    return NextResponse.redirect(new URL('/auth', origin));
  }

  const response = NextResponse.redirect(new URL(next, origin));
  const supabase = createServerClient<Database>(
    getSupabaseServerUrl(),
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
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
  



  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error('[auth] exchangeCodeForSession failed', error);
    return NextResponse.redirect(new URL('/auth?error=callback-failed', origin));
  }

  return response;
}
