import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/route';

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store'
    }
  });

export async function POST(req: Request) {
  let payload: any = null;
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false, errorCode: 'invalid_json' }, 400);
  }

  const idToken = typeof payload?.idToken === 'string' ? payload.idToken.trim() : '';
  const accessToken = typeof payload?.accessToken === 'string' ? payload.accessToken.trim() : '';
  const nonce = typeof payload?.nonce === 'string' ? payload.nonce.trim() : '';

  const logBase = {
    hasIdToken: Boolean(idToken),
    idTokenLen: idToken.length,
    hasAccessToken: Boolean(accessToken),
    accessTokenLen: accessToken.length
  };

  if (!idToken) {
    console.warn('[native-session]', JSON.stringify({ ...logBase, result: 'error', errorCode: 'missing_id_token' }));
    return json({ ok: false, errorCode: 'missing_id_token' }, 400);
  }

  try {
    const supabase = createRouteClient();
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
      access_token: accessToken || undefined,
      nonce: nonce || undefined
    });

    if (error || !data?.session) {
      const errorCode = error?.name ?? 'missing_session';
      console.warn('[native-session]', JSON.stringify({
        ...logBase,
        result: 'error',
        errorCode
      }));
      return json(
        {
          ok: false,
          errorCode,
          message: error?.message ?? 'Authentication failed'
        },
        400
      );
    }

    console.log('[native-session]', JSON.stringify({ ...logBase, result: 'ok' }));
    return json({ ok: true });
  } catch (error) {
    console.warn('[native-session]', JSON.stringify({ ...logBase, result: 'error', errorCode: 'server_error' }));
    return json(
      {
        ok: false,
        errorCode: 'server_error',
        message: error instanceof Error ? error.message : 'Server error'
      },
      500
    );
  }
}

export async function GET() {
  return json({ ok: false }, 405);
}
