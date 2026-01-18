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
  const endpoint = body?.endpoint;
  const p256dh = body?.keys?.p256dh;
  const auth = body?.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: 'invalid-payload' }, { status: 400 });
  }

  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: installs } = await supabase
    .from('device_installations')
    .select('id')
    .eq('user_id', user.id)
    .eq('platform', 'android')
    .gte('last_seen_at', cutoff)
    .limit(1);
  if (installs && installs.length > 0) {
    return NextResponse.json({ error: 'android_app_active' }, { status: 409 });
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id: user.id,
        endpoint,
        p256dh,
        auth,
        is_disabled: false,
        disabled_reason: null
      },
      { onConflict: 'endpoint' }
    );

  if (error) {
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
