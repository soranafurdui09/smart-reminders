import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/route';

export async function POST(request: Request) {
  const supabase = createRouteClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const token = typeof body?.token === 'string' ? body.token.trim() : '';
  const platform = typeof body?.platform === 'string' && body.platform ? body.platform : 'android';
  const deviceId = typeof body?.deviceId === 'string' && body.deviceId ? body.deviceId : null;

  if (!token) {
    return NextResponse.json({ error: 'invalid-payload' }, { status: 400 });
  }

  const nowIso = new Date().toISOString();
  const { error } = await supabase
    .from('fcm_tokens')
    .upsert(
      {
        user_id: user.id,
        token,
        platform,
        device_id: deviceId,
        is_disabled: false,
        last_seen_at: nowIso,
        updated_at: nowIso
      },
      { onConflict: 'token' }
    );

  if (error) {
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
