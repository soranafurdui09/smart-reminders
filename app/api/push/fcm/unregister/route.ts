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

  if (!token) {
    return NextResponse.json({ error: 'invalid-payload' }, { status: 400 });
  }

  const nowIso = new Date().toISOString();
  const { error } = await supabase
    .from('fcm_tokens')
    .update({ is_disabled: true, updated_at: nowIso })
    .eq('token', token)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
