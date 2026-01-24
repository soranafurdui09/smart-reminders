'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import { getUserHousehold, getUserTimeZone } from '@/lib/data';
import {
  buildMedicationDoseInstances,
  ensureMedicationScheduleDoses,
  shouldTriggerRefill,
  type MedicationForm,
  type MedicationRecord,
  type MedicationScheduleInput
} from '@/lib/reminders/medication';
import { scheduleNotificationJobsForMedication, scheduleNotificationJobsForReminder } from '@/lib/notifications/jobs';
import { resolveTimeZone } from '@/lib/time/schedule';

const DEFAULT_FORM = 'pill';

function parseMedicationForm(value: string): MedicationForm | null {
  if (value === 'pill' || value === 'capsule' || value === 'drops' || value === 'injection' || value === 'other') {
    return value;
  }
  return null;
}

function parseTimes(raw: FormDataEntryValue[] | string[]) {
  return raw
    .map((entry) => String(entry || '').trim())
    .filter(Boolean);
}

function parseDays(raw: FormDataEntryValue[] | string[]) {
  return raw
    .map((entry) => Number(entry))
    .filter((value) => Number.isFinite(value) && value >= 0 && value <= 6);
}

async function logMedicationEvent(supabase: ReturnType<typeof createServerClient>, payload: {
  householdId: string;
  medicationId: string;
  doseId?: string | null;
  actorId: string;
  eventType: string;
  eventPayload?: Record<string, unknown> | null;
}) {
  await supabase.from('medication_events').insert({
    household_id: payload.householdId,
    medication_id: payload.medicationId,
    dose_instance_id: payload.doseId ?? null,
    actor_profile_id: payload.actorId,
    event_type: payload.eventType,
    payload: payload.eventPayload ?? null
  });
}

export async function createMedication(formData: FormData) {
  const user = await requireUser('/app/medications/new');
  const membership = await getUserHousehold(user.id);
  if (!membership?.households) {
    return { ok: false, error: 'no-household' as const };
  }

  const supabase = createServerClient();
  const name = String(formData.get('name') || '').trim();
  if (!name) {
    return { ok: false, error: 'missing-name' as const };
  }

  const userTimeZone = await getUserTimeZone(user.id);
  const tz = resolveTimeZone(String(formData.get('timezone') || '').trim() || userTimeZone || 'UTC');
  const form = parseMedicationForm(String(formData.get('form') || DEFAULT_FORM).trim()) ?? DEFAULT_FORM;
  const strength = String(formData.get('strength') || '').trim() || null;
  const notes = String(formData.get('notes') || '').trim() || null;
  const patientMemberId = String(formData.get('patient_member_id') || '').trim() || null;

  const scheduleType = String(formData.get('schedule_type') || 'daily') as MedicationScheduleInput['schedule_type'];
  const timesLocal = parseTimes(formData.getAll('times_local'));
  const daysOfWeek = parseDays(formData.getAll('days_of_week'));
  const startDate = String(formData.get('start_date') || '').trim();
  const endDate = String(formData.get('end_date') || '').trim() || null;
  const intervalHours = Number(formData.get('interval_hours') || '');
  const reminderWindow = Number(formData.get('reminder_window_minutes') || 60);
  const doseAmount = formData.get('dose_amount') ? Number(formData.get('dose_amount')) : null;
  const doseUnit = String(formData.get('dose_unit') || '').trim() || null;

  const schedule: MedicationScheduleInput = {
    schedule_type: scheduleType,
    days_of_week: daysOfWeek.length ? daysOfWeek : null,
    times_local: timesLocal,
    start_date: startDate,
    end_date: endDate,
    interval_hours: Number.isFinite(intervalHours) ? intervalHours : null,
    dose_amount: doseAmount,
    dose_unit: doseUnit,
    reminder_window_minutes: Number.isFinite(reminderWindow) ? reminderWindow : 60,
    allow_snooze: String(formData.get('allow_snooze') || '1') === '1'
  };

  const planned = buildMedicationDoseInstances({
    medication: {
      id: 'pending',
      reminder_id: 'pending',
      household_id: membership.households.id,
      created_by: user.id,
      patient_member_id: patientMemberId,
      name,
      form,
      strength,
      notes,
      is_active: true,
      timezone: tz
    },
    schedule,
    horizonDays: 7,
    timeZone: tz
  });

  const firstDose = planned[0]?.scheduled_at ? new Date(planned[0].scheduled_at) : new Date();

  const { data: reminder, error: reminderError } = await supabase
    .from('reminders')
    .insert({
      household_id: membership.households.id,
      created_by: user.id,
      title: name,
      notes: doseUnit || doseAmount ? `Doza: ${doseAmount ?? ''} ${doseUnit ?? ''}`.trim() : notes,
      schedule_type: 'once',
      due_at: firstDose.toISOString(),
      tz,
      kind: 'medication',
      medication_details: {
        name,
        dose: doseUnit || doseAmount ? `${doseAmount ?? ''} ${doseUnit ?? ''}`.trim() : null,
        personId: patientMemberId,
        frequencyType: 'once_per_day',
        timesOfDay: timesLocal,
        startDate
      }
    })
    .select('id')
    .maybeSingle();
  if (reminderError || !reminder) {
    console.error('[medication] create reminder failed', reminderError);
    return { ok: false, error: 'create-reminder' as const };
  }

  const { data: medication, error: medicationError } = await supabase
    .from('medications')
    .insert({
      household_id: membership.households.id,
      reminder_id: reminder.id,
      created_by: user.id,
      patient_member_id: patientMemberId,
      name,
      form,
      strength,
      notes,
      timezone: tz,
      is_active: true
    })
    .select('*')
    .maybeSingle();
  if (medicationError || !medication) {
    console.error('[medication] create medication failed', medicationError);
    return { ok: false, error: 'create-medication' as const };
  }

  const { error: scheduleError } = await supabase
    .from('medication_schedules')
    .insert({
      medication_id: medication.id,
      schedule_type: schedule.schedule_type,
      days_of_week: schedule.days_of_week,
      times_local: schedule.times_local,
      start_date: schedule.start_date,
      end_date: schedule.end_date,
      interval_hours: schedule.interval_hours,
      dose_amount: schedule.dose_amount,
      dose_unit: schedule.dose_unit,
      reminder_window_minutes: schedule.reminder_window_minutes,
      allow_snooze: schedule.allow_snooze
    });
  if (scheduleError) {
    console.error('[medication] create schedule failed', scheduleError);
  }

  const stockQty = Number(formData.get('stock_quantity') || 0);
  const stockUnit = String(formData.get('stock_unit') || '').trim() || 'pills';
  const decrement = Number(formData.get('stock_decrement') || 1);
  const threshold = formData.get('low_stock_threshold') ? Number(formData.get('low_stock_threshold')) : null;
  const refillLead = Number(formData.get('refill_lead_days') || 5);

  const { error: stockError } = await supabase
    .from('medication_stock')
    .insert({
      medication_id: medication.id,
      quantity_on_hand: Number.isFinite(stockQty) ? stockQty : 0,
      unit: stockUnit,
      decrement_per_dose: Number.isFinite(decrement) ? decrement : 1,
      low_stock_threshold: Number.isFinite(threshold) ? threshold : null,
      refill_lead_days: Number.isFinite(refillLead) ? refillLead : 5,
      refill_enabled: String(formData.get('refill_enabled') || '1') === '1'
    });
  if (stockError) {
    console.error('[medication] create stock failed', stockError);
  }

  await ensureMedicationScheduleDoses({
    medication: medication as MedicationRecord,
    schedule,
    horizonDays: 7,
    timeZone: tz
  });
  await scheduleNotificationJobsForMedication({
    reminderId: reminder.id,
    userId: user.id
  });

  await logMedicationEvent(supabase, {
    householdId: membership.households.id,
    medicationId: medication.id,
    actorId: user.id,
    eventType: 'created_med',
    eventPayload: { schedule_type: schedule.schedule_type, times_local: schedule.times_local }
  });

  revalidatePath('/app/medications');
  revalidatePath('/app');
  return { ok: true, medicationId: medication.id };
}

export async function updateMedication(medicationId: string, formData: FormData) {
  const user = await requireUser(`/app/medications/${medicationId}`);
  const supabase = createServerClient();
  const {
    data: medication
  } = await supabase
    .from('medications')
    .select('*')
    .eq('id', medicationId)
    .maybeSingle();
  if (!medication) {
    return { ok: false, error: 'not-found' as const };
  }

  const tz = resolveTimeZone(String(formData.get('timezone') || '').trim() || medication.timezone || 'UTC');
  const name = String(formData.get('name') || medication.name).trim();
  const form = parseMedicationForm(String(formData.get('form') || medication.form || DEFAULT_FORM).trim()) ?? DEFAULT_FORM;
  const strength = String(formData.get('strength') || '').trim() || null;
  const notes = String(formData.get('notes') || '').trim() || null;
  const patientMemberId = String(formData.get('patient_member_id') || '').trim() || null;

  const scheduleType = String(formData.get('schedule_type') || 'daily') as MedicationScheduleInput['schedule_type'];
  const timesLocal = parseTimes(formData.getAll('times_local'));
  const daysOfWeek = parseDays(formData.getAll('days_of_week'));
  const startDate = String(formData.get('start_date') || '').trim();
  const endDate = String(formData.get('end_date') || '').trim() || null;
  const intervalHours = Number(formData.get('interval_hours') || '');
  const reminderWindow = Number(formData.get('reminder_window_minutes') || 60);
  const doseAmount = formData.get('dose_amount') ? Number(formData.get('dose_amount')) : null;
  const doseUnit = String(formData.get('dose_unit') || '').trim() || null;

  const schedule: MedicationScheduleInput = {
    schedule_type: scheduleType,
    days_of_week: daysOfWeek.length ? daysOfWeek : null,
    times_local: timesLocal,
    start_date: startDate,
    end_date: endDate,
    interval_hours: Number.isFinite(intervalHours) ? intervalHours : null,
    dose_amount: doseAmount,
    dose_unit: doseUnit,
    reminder_window_minutes: Number.isFinite(reminderWindow) ? reminderWindow : 60,
    allow_snooze: String(formData.get('allow_snooze') || '1') === '1'
  };

  await supabase
    .from('medications')
    .update({
      name,
      form,
      strength,
      notes,
      patient_member_id: patientMemberId,
      timezone: tz
    })
    .eq('id', medicationId);

  await supabase
    .from('medication_schedules')
    .delete()
    .eq('medication_id', medicationId);
  await supabase
    .from('medication_schedules')
    .insert({
      medication_id: medicationId,
      schedule_type: schedule.schedule_type,
      days_of_week: schedule.days_of_week,
      times_local: schedule.times_local,
      start_date: schedule.start_date,
      end_date: schedule.end_date,
      interval_hours: schedule.interval_hours,
      dose_amount: schedule.dose_amount,
      dose_unit: schedule.dose_unit,
      reminder_window_minutes: schedule.reminder_window_minutes,
      allow_snooze: schedule.allow_snooze
    });

  const nowIso = new Date().toISOString();
  await supabase
    .from('medication_doses')
    .delete()
    .eq('medication_id', medicationId)
    .eq('status', 'pending')
    .gte('scheduled_at', nowIso);

  await ensureMedicationScheduleDoses({
    medication: medication as MedicationRecord,
    schedule,
    horizonDays: 7,
    timeZone: tz
  });

  if (medication.reminder_id) {
    await scheduleNotificationJobsForMedication({
      reminderId: medication.reminder_id,
      userId: user.id
    });
  }

  await logMedicationEvent(supabase, {
    householdId: medication.household_id,
    medicationId,
    actorId: user.id,
    eventType: 'updated_med',
    eventPayload: { schedule_type: schedule.schedule_type }
  });

  revalidatePath(`/app/medications/${medicationId}`);
  revalidatePath('/app/medications');
  revalidatePath('/app');
  return { ok: true };
}

export async function updateMedicationStock(medicationId: string, formData: FormData) {
  const user = await requireUser(`/app/medications/${medicationId}`);
  const supabase = createServerClient();
  const quantity = Number(formData.get('quantity') || 0);
  const unit = String(formData.get('unit') || '').trim() || 'pills';
  const decrement = Number(formData.get('decrement_per_dose') || 1);
  const threshold = formData.get('low_stock_threshold') ? Number(formData.get('low_stock_threshold')) : null;
  const refillLead = Number(formData.get('refill_lead_days') || 5);
  const refillEnabled = String(formData.get('refill_enabled') || '1') === '1';

  const { data: medication } = await supabase
    .from('medications')
    .select('id, household_id')
    .eq('id', medicationId)
    .maybeSingle();
  if (!medication) {
    return { ok: false, error: 'not-found' as const };
  }

  await supabase
    .from('medication_stock')
    .upsert({
      medication_id: medicationId,
      quantity_on_hand: Number.isFinite(quantity) ? quantity : 0,
      unit,
      decrement_per_dose: Number.isFinite(decrement) ? decrement : 1,
      low_stock_threshold: Number.isFinite(threshold) ? threshold : null,
      refill_lead_days: Number.isFinite(refillLead) ? refillLead : 5,
      refill_enabled: refillEnabled,
      last_refill_at: new Date().toISOString()
    });

  await logMedicationEvent(supabase, {
    householdId: medication.household_id,
    medicationId,
    actorId: user.id,
    eventType: 'updated_stock',
    eventPayload: { quantity, unit }
  });

  revalidatePath(`/app/medications/${medicationId}`);
  return { ok: true };
}

export async function maybeTriggerRefill(medicationId: string) {
  const user = await requireUser('/app/medications');
  const supabase = createServerClient();
  const { data: medication } = await supabase
    .from('medications')
    .select('id, name, household_id, reminder_id, created_by, timezone')
    .eq('id', medicationId)
    .maybeSingle();
  if (!medication) return;

  const { data: schedule } = await supabase
    .from('medication_schedules')
    .select('*')
    .eq('medication_id', medicationId)
    .maybeSingle();
  const { data: stock } = await supabase
    .from('medication_stock')
    .select('*')
    .eq('medication_id', medicationId)
    .maybeSingle();
  if (!schedule || !stock) return;

  if (!shouldTriggerRefill({ stock, schedule })) return;

  const dayAgo = new Date();
  dayAgo.setDate(dayAgo.getDate() - 1);
  const { data: recent } = await supabase
    .from('medication_events')
    .select('id')
    .eq('medication_id', medicationId)
    .eq('event_type', 'refill_triggered')
    .gte('created_at', dayAgo.toISOString())
    .limit(1);
  if (recent && recent.length > 0) return;

  const { data: reminder } = await supabase
    .from('reminders')
    .insert({
      household_id: medication.household_id,
      created_by: medication.created_by,
      title: `Reumplere: ${medication.name}`,
      notes: 'Stoc medicamente scăzut',
      schedule_type: 'once',
      due_at: new Date().toISOString(),
      tz: medication.timezone || 'UTC',
      kind: 'generic'
    })
    .select('id, due_at')
    .maybeSingle();
  if (reminder?.id) {
    await scheduleNotificationJobsForReminder({
      reminderId: reminder.id,
      userId: medication.created_by,
      dueAt: new Date(reminder.due_at ?? new Date().toISOString())
    });
  }

  await logMedicationEvent(supabase, {
    householdId: medication.household_id,
    medicationId,
    actorId: user.id,
    eventType: 'refill_triggered',
    eventPayload: { quantity_on_hand: stock.quantity_on_hand }
  });
}

export async function addMedicationCaregiver(medicationId: string, formData: FormData) {
  const user = await requireUser(`/app/medications/${medicationId}`);
  const supabase = createServerClient();
  const caregiverMemberId = String(formData.get('caregiver_member_id') || '').trim();
  const patientMemberId = String(formData.get('patient_member_id') || '').trim();
  if (!caregiverMemberId || !patientMemberId) {
    return { ok: false, error: 'missing-member' as const };
  }

  const escalationMinutes = Number(formData.get('escalation_after_minutes') || 30);
  const canEdit = String(formData.get('can_edit') || '0') === '1';
  const escalationEnabled = String(formData.get('escalation_enabled') || '1') === '1';
  const channels = formData.getAll('escalation_channels').map((value) => String(value)).filter(Boolean);

  const { data: medication } = await supabase
    .from('medications')
    .select('id, household_id')
    .eq('id', medicationId)
    .maybeSingle();
  if (!medication) {
    return { ok: false, error: 'not-found' as const };
  }

  await supabase.from('medication_caregivers').insert({
    household_id: medication.household_id,
    patient_member_id: patientMemberId,
    caregiver_member_id: caregiverMemberId,
    can_edit: canEdit,
    escalation_enabled: escalationEnabled,
    escalation_after_minutes: Number.isFinite(escalationMinutes) ? escalationMinutes : 30,
    escalation_channels: channels.length ? channels : ['push']
  });

  revalidatePath(`/app/medications/${medicationId}`);
  revalidatePath('/app/medications/caregiver');
  return { ok: true };
}

export async function removeMedicationCaregiver(medicationId: string, caregiverId: string) {
  const user = await requireUser(`/app/medications/${medicationId}`);
  const supabase = createServerClient();
  await supabase
    .from('medication_caregivers')
    .delete()
    .eq('id', caregiverId);
  revalidatePath(`/app/medications/${medicationId}`);
  revalidatePath('/app/medications/caregiver');
  return { ok: true };
}
