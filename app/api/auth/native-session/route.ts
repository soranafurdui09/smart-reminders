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
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set({ name, value, ...options });
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
    return json({ ok: false, errorCode: 'invalid_json' }, 400);
  }

  const accessToken = typeof payload?.access_token === 'string' ? payload.access_token.trim() : '';
  const refreshToken = typeof payload?.refresh_token === 'string' ? payload.refresh_token.trim() : '';

  const summary = {
    hasAccessToken: Boolean(accessToken),
    accessTokenLen: accessToken.length,
    hasRefreshToken: Boolean(refreshToken),
    refreshTokenLen: refreshToken.length
  };

  if (!accessToken || !refreshToken || accessToken.length < 20 || refreshToken.length < 20) {
    console.warn('[native-bridge]', JSON.stringify({ ...summary, result: 'error', errorCode: 'invalid_tokens' }));
    return json({ ok: false, errorCode: 'invalid_tokens' }, 400);
  }

  try {
    const supabase = createRouteSupabase();
    const { error: setError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    });

    if (setError) {
      await supabase.auth.signOut();
      console.warn('[native-bridge]', JSON.stringify({
        ...summary,
        result: 'error',
        errorCode: setError.name ?? 'set_session_failed'
      }));
      return json({ ok: false, errorCode: setError.name ?? 'set_session_failed' }, 401);
    }

    const { data, error: userError } = await supabase.auth.getUser();
    if (userError || !data?.user) {
      await supabase.auth.signOut();
      console.warn('[native-bridge]', JSON.stringify({
        ...summary,
        result: 'error',
        errorCode: userError?.name ?? 'invalid_session'
      }));
      return json({ ok: false, errorCode: userError?.name ?? 'invalid_session' }, 401);
    }

    console.log('[native-bridge]', JSON.stringify({ ...summary, result: 'ok' }));
    return json({ ok: true, hasUser: true });
  } catch (error) {
    console.warn('[native-bridge]', JSON.stringify({ ...summary, result: 'error', errorCode: 'server_error' }));
    return json({ ok: false, errorCode: 'server_error' }, 500);
  }
}

export async function GET() {
  return json({ ok: false }, 405);
}
