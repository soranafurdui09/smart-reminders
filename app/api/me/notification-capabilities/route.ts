import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/route';

const ACTIVE_DAYS = 7;

export async function GET() {
  const supabase = createRouteClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - ACTIVE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('device_installations')
    .select('id')
    .eq('user_id', user.id)
    .eq('platform', 'android')
    .gte('last_seen_at', cutoff)
    .limit(1);

  if (error) {
    console.error('[capabilities] lookup failed', error);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }

  const hasActiveAndroidApp = Boolean(data && data.length > 0);
  return NextResponse.json({
    has_active_android_app: hasActiveAndroidApp,
    can_use_web_push: !hasActiveAndroidApp
  });
}
