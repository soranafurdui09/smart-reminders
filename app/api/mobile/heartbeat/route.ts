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
  const deviceId = typeof body?.device_id === 'string' ? body.device_id.trim() : '';
  const platform = body?.platform === 'android' ? 'android' : '';
  if (!deviceId || !platform) {
    return NextResponse.json({ error: 'invalid-payload' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { error: upsertError } = await supabase
    .from('device_installations')
    .upsert(
      {
        user_id: user.id,
        platform,
        device_id: deviceId,
        last_seen_at: now
      },
      { onConflict: 'user_id,platform,device_id' }
    );

  if (upsertError) {
    console.error('[mobile] heartbeat upsert failed', upsertError);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, last_seen_at: now });
}
