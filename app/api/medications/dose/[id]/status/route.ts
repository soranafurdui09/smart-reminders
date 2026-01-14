import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/route';

export const runtime = 'nodejs';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createRouteClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  let payload: { status?: string; skippedReason?: string } | null = null;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid payload.' }, { status: 400 });
  }

  const status = String(payload?.status || '').trim();
  if (!['taken', 'skipped'].includes(status)) {
    return NextResponse.json({ ok: false, error: 'Invalid status.' }, { status: 400 });
  }

  const updates =
    status === 'taken'
      ? { status: 'taken', taken_at: new Date().toISOString(), skipped_reason: null }
      : { status: 'skipped', skipped_reason: payload?.skippedReason ?? null };

  const { data: dose, error } = await supabase
    .from('medication_doses')
    .update(updates)
    .eq('id', params.id)
    .select('id, status, skipped_reason, taken_at')
    .maybeSingle();
  if (error || !dose) {
    console.error('[medication] update dose failed', error);
    return NextResponse.json({ ok: false, error: 'Failed to update dose.' }, { status: 400 });
  }

  return NextResponse.json({ ok: true, dose });
}
