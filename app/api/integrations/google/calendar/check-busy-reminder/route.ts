import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/route';
import { isUserBusyInCalendarAt } from '@/lib/google/calendar';

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

  const { data: reminder, error } = await supabase
    .from('reminders')
    .select('id, due_at')
    .eq('id', reminderId)
    .maybeSingle();
  if (error) {
    console.error('[google] reminder lookup failed', error);
    return NextResponse.json({ ok: false, error: 'Could not load reminder.' }, { status: 400 });
  }
  if (!reminder) {
    return NextResponse.json({ ok: false, error: 'Reminder not found.' }, { status: 404 });
  }
  if (!reminder.due_at) {
    return NextResponse.json({ ok: false, error: 'Reminder missing due date.' }, { status: 400 });
  }

  const busy = await isUserBusyInCalendarAt({
    userId: user.id,
    at: new Date(reminder.due_at)
  });
  return NextResponse.json({ ok: true, busy });
}
