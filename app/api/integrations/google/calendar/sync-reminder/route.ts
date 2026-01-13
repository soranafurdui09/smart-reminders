import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/route';
import { createOrUpdateCalendarEventForReminder } from '@/lib/google/calendar';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const supabase = createRouteClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  let payload: { reminderId?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON.' }, { status: 400 });
  }

  const reminderId = String(payload.reminderId || '').trim();
  if (!reminderId) {
    return NextResponse.json({ ok: false, error: 'Missing reminderId.' }, { status: 400 });
  }

  try {
    const result = await createOrUpdateCalendarEventForReminder({ userId: user.id, reminderId });
    return NextResponse.json({ ok: true, eventId: result.eventId });
  } catch (error) {
    console.error('[google] sync reminder failed', error);
    return NextResponse.json({ ok: false, error: 'Sync failed.' }, { status: 500 });
  }
}
