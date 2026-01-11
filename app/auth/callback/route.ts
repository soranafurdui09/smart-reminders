import { cookies } from 'next/headers';
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

  const cookieStore = cookies();
  const supabase = createServerClient<Database>(
    getSupabaseServerUrl(),
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      auth: {
        storageKey: getSupabaseStorageKey()
      },
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: Parameters<typeof cookieStore.set>[0]) {
          const cookieOptions = typeof options === 'object' && options ? options : {};
          cookieStore.set({ name, value, ...cookieOptions });
        },
        remove(name: string, options: Parameters<typeof cookieStore.set>[0]) {
          const cookieOptions = typeof options === 'object' && options ? options : {};
          cookieStore.set({ name, value: '', ...cookieOptions, maxAge: 0 });
        }
      }
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error('[auth] exchangeCodeForSession failed', error);
    return NextResponse.redirect(new URL('/auth?error=callback-failed', origin));
  }

  return NextResponse.redirect(new URL(next, origin));
}
