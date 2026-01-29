import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/lib/supabase/types';
import { getRequiredEnv, getSupabaseServerUrl, getSupabaseStorageKey } from '@/lib/env';

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store'
    }
  });

const createRouteSupabase = () => {
  const cookieStore = cookies();
  return createServerClient<Database>(
    getSupabaseServerUrl(),
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      auth: {
        storageKey: getSupabaseStorageKey()
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: Array<{ name: string; value: string; options?: Parameters<typeof cookieStore.set>[0] }>
        ) {
          cookiesToSet.forEach(({ name, value, options }) => {
            const cookieOptions = options && typeof options === 'object' ? options : {};
            cookieStore.set({ name, value, ...cookieOptions });
          });
        }
      }
    }
  );
};

export async function POST() {
  try {
    const supabase = createRouteSupabase();
    await supabase.auth.signOut();
    return json({ ok: true });
  } catch {
    return json({ ok: false }, 500);
  }
}

export async function GET() {
  return json({ ok: false }, 405);
}
