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

  let payload: { status?: string; skippedReason?: string; snoozeMinutes?: number } | null = null;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid payload.' }, { status: 400 });
  }

  const status = String(payload?.status || '').trim();
  if (!['taken', 'skipped', 'snoozed'].includes(status)) {
    return NextResponse.json({ ok: false, error: 'Invalid status.' }, { status: 400 });
  }

  const { data: dose, error: doseError } = await supabase
    .from('medication_doses')
    .select('id, status, medication_id, reminder_id, household_id, patient_member_id, stock_decremented, confirmation_deadline')
    .eq('id', params.id)
    .maybeSingle();
  if (doseError || !dose) {
    console.error('[medication] load dose failed', doseError);
    return NextResponse.json({ ok: false, error: 'Dose not found.' }, { status: 404 });
  }

  if (status === 'skipped' && !payload?.skippedReason) {
    return NextResponse.json({ ok: false, error: 'Skip reason required.' }, { status: 400 });
  }

  if (dose.household_id && dose.patient_member_id && dose.patient_member_id !== '') {
    const { data: membership } = await supabase
      .from('household_members')
      .select('id')
      .eq('household_id', dose.household_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ ok: false, error: 'Forbidden.' }, { status: 403 });
    }

    if (dose.patient_member_id && dose.patient_member_id !== membership.id) {
      const { data: caregiver } = await supabase
        .from('medication_caregivers')
        .select('can_edit')
        .eq('patient_member_id', dose.patient_member_id)
        .eq('caregiver_member_id', membership.id)
        .maybeSingle();

      if (!caregiver?.can_edit) {
        return NextResponse.json({ ok: false, error: 'Forbidden.' }, { status: 403 });
      }
    }
  }

  const nowIso = new Date().toISOString();
  const snoozeMinutes = Math.max(5, Number(payload?.snoozeMinutes || 10));
  const nextSnooze = new Date(Date.now() + snoozeMinutes * 60000).toISOString();
  const updates =
    status === 'taken'
      ? { status: 'taken', taken_at: nowIso, skipped_reason: null, skipped_at: null, missed_at: null }
      : status === 'skipped'
        ? { status: 'skipped', skipped_reason: payload?.skippedReason ?? null, skipped_at: nowIso, taken_at: null, missed_at: null }
        : {
            snoozed_until: nextSnooze,
            confirmation_deadline: dose.confirmation_deadline
              ? new Date(new Date(dose.confirmation_deadline).getTime() + snoozeMinutes * 60000).toISOString()
              : new Date(Date.now() + 60 * 60000).toISOString()
          };

  const { data: updatedDose, error } = await supabase
    .from('medication_doses')
    .update(updates)
    .eq('id', params.id)
    .select('id, status, skipped_reason, taken_at, snoozed_until')
    .maybeSingle();
  if (error || !updatedDose) {
    console.error('[medication] update dose failed', error);
    return NextResponse.json({ ok: false, error: 'Failed to update dose.' }, { status: 400 });
  }

  if (status === 'taken' && dose.medication_id && !dose.stock_decremented) {
    const { data: stock } = await supabase
      .from('medication_stock')
      .select('quantity_on_hand, decrement_per_dose')
      .eq('medication_id', dose.medication_id)
      .maybeSingle();
    if (stock) {
      const nextQty = Math.max(0, Number(stock.quantity_on_hand) - Math.max(1, Number(stock.decrement_per_dose || 1)));
      await supabase
        .from('medication_stock')
        .update({ quantity_on_hand: nextQty, updated_at: nowIso })
        .eq('medication_id', dose.medication_id);
    }
    await supabase
      .from('medication_doses')
      .update({ stock_decremented: true })
      .eq('id', dose.id);
  }

  return NextResponse.json({ ok: true, dose: updatedDose });
}
