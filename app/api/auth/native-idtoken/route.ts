import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/lib/supabase/types';
import { getRequiredEnv, getSupabaseServerUrl, getSupabaseStorageKey } from '@/lib/env';

export const runtime = 'nodejs';

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store'
    }
  });

const createRouteSupabase = (onSetAll?: (count: number) => void) => {
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
          onSetAll?.(cookiesToSet.length);
          cookiesToSet.forEach(({ name, value, options }) => {
            const cookieOptions = options && typeof options === 'object' ? options : {};
            cookieStore.set({ name, value, ...cookieOptions });
          });
        }
      }
    }
  );
};

export async function POST(req: Request) {
  let payload: any = null;
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }

  const idToken = typeof payload?.idToken === 'string' ? payload.idToken.trim() : '';
  const nonce = typeof payload?.nonce === 'string' ? payload.nonce.trim() : '';
  const next = typeof payload?.next === 'string' ? payload.next : undefined;

  const headerList = headers();
  const origin = headerList.get('origin') ?? headerList.get('host') ?? 'unknown';
  const summary = {
    origin,
    hasIdToken: Boolean(idToken),
    idTokenLen: idToken.length,
    hasNonce: Boolean(nonce),
    nonceLen: nonce.length,
    next
  };

  if (!idToken || !nonce) {
    console.warn('[native-idtoken]', JSON.stringify({ ...summary, result: 'error', code: 'missing_fields' }));
    return json({ ok: false, error: 'missing_fields', code: 'missing_fields' }, 401);
  }

  let setCookieCount = 0;

  try {
    const supabase = createRouteSupabase((count) => {
      setCookieCount = count;
    });
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
      nonce
    });

    if (error || !data?.session) {
      console.warn('[native-idtoken]', JSON.stringify({
        ...summary,
        result: 'error',
        code: error?.name ?? 'auth_failed',
        setCookieCount
      }));
      return json({ ok: false, error: error?.message ?? 'auth_failed', code: error?.name ?? 'auth_failed' }, 401);
    }

    console.log('[native-idtoken]', JSON.stringify({ ...summary, result: 'ok', setCookieCount }));
    return json({ ok: true, next });
  } catch (error) {
    console.warn('[native-idtoken]', JSON.stringify({ ...summary, result: 'error', code: 'server_error' }));
    return json({ ok: false, error: 'server_error', code: 'server_error' }, 500);
  }
}

export async function GET() {
  return json({ ok: false }, 405);
}
