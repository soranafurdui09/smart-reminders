import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/route';
import { autoBlockTimeForReminder } from '@/lib/google/calendar';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const supabase = createRouteClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  let payload: { reminderId?: string } | null = null;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid payload.' }, { status: 400 });
  }

  const reminderId = String(payload?.reminderId ?? '').trim();
  if (!reminderId) {
    return NextResponse.json({ ok: false, error: 'Missing reminderId.' }, { status: 400 });
  }

  try {
    const result = await autoBlockTimeForReminder({
      userId: user.id,
      reminderId
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error: any) {
    console.error('[google] auto-block error', error);
    const message = error?.message ?? 'Auto-block failed.';
    const status = message.includes('connected') ? 403 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
