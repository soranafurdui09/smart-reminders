import Link from 'next/link';
import { notFound } from 'next/navigation';
import AppShell from '@/components/AppShell';
import SectionHeader from '@/components/SectionHeader';
import ActionSubmitButton from '@/components/ActionSubmitButton';
import Card from '@/components/ui/Card';
import { requireUser } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { getHouseholdMembers, getUserHousehold, getUserLocale } from '@/lib/data';
import { messages } from '@/lib/i18n';
import { estimateDailyDoseCount } from '@/lib/reminders/medication';
import { formatDateTimeWithTimeZone } from '@/lib/dates';
import { addMedicationCaregiver, maybeTriggerRefill, removeMedicationCaregiver, updateMedicationStock } from '../actions';

export default async function MedicationDetailPage({ params }: { params: { id: string } }) {
  const user = await requireUser(`/app/medications/${params.id}`);
  const locale = await getUserLocale(user.id);
  const copy = messages[locale];
  const membership = await getUserHousehold(user.id);
  if (!membership?.households) {
    notFound();
  }

  const supabase = createServerClient();
  const { data: medication } = await supabase
    .from('medications')
    .select('id, name, form, strength, notes, patient_member_id, timezone, reminder_id, household_id')
    .eq('id', params.id)
    .maybeSingle();
  if (!medication) {
    notFound();
  }

  const { data: schedule } = await supabase
    .from('medication_schedules')
    .select('*')
    .eq('medication_id', params.id)
    .maybeSingle();

  const { data: stock } = await supabase
    .from('medication_stock')
    .select('*')
    .eq('medication_id', params.id)
    .maybeSingle();

  const { data: caregivers } = await supabase
    .from('medication_caregivers')
    .select('id, patient_member_id, caregiver_member_id, can_edit, escalation_enabled, escalation_after_minutes, escalation_channels')
    .eq('household_id', medication.household_id);

  const { data: doseHistory } = await supabase
    .from('medication_doses')
    .select('id, scheduled_at, status, skipped_reason, taken_at, snoozed_until')
    .eq('medication_id', params.id)
    .order('scheduled_at', { ascending: false })
    .limit(30);

  const members = await getHouseholdMembers(membership.households.id);
  const memberLabels = new Map(
    members.map((member: any) => [member.id, member.profiles?.name || member.profiles?.email || member.user_id])
  );
  const patientLabel = medication.patient_member_id ? memberLabels.get(medication.patient_member_id) : null;

  const dailyDoseCount = schedule ? estimateDailyDoseCount(schedule) : 0;
  const daysLeft = stock
    ? dailyDoseCount
      ? Math.floor(Number(stock.quantity_on_hand) / Math.max(1, Number(stock.decrement_per_dose || 1)) / dailyDoseCount)
      : null
    : null;
  const scheduleTypeLabels: Record<string, string> = {
    daily: copy.medicationsHub.schedule_daily,
    weekdays: copy.medicationsHub.schedule_weekdays,
    custom_days: copy.medicationsHub.schedule_custom_days,
    interval: copy.medicationsHub.schedule_interval,
    prn: copy.medicationsHub.schedule_prn
  };
  const statusLabels: Record<string, string> = {
    pending: copy.medicationsHub.status_pending,
    taken: copy.medicationsHub.status_taken,
    skipped: copy.medicationsHub.status_skipped,
    snoozed: copy.medicationsHub.status_snoozed,
    missed: copy.medicationsHub.status_missed
  };
  const triggerRefillAction = async () => {
    await maybeTriggerRefill(medication.id);
  };
  const removeCaregiverAction = async (formData: FormData) => {
    const caregiverId = String(formData.get('caregiver_id') || '').trim();
    if (!caregiverId) return;
    await removeMedicationCaregiver(medication.id, caregiverId);
  };
  const addCaregiverAction = async (formData: FormData) => {
    await addMedicationCaregiver(medication.id, formData);
  };

  const updateStockAction = async (formData: FormData) => {
    await updateMedicationStock(medication.id, formData);
  };

  return (
    <AppShell locale={locale} activePath="/app/medications" userEmail={user.email}>
      <div className="space-y-8 pb-24">
        <SectionHeader title={copy.medicationsHub.detailTitle} description={copy.medicationsHub.detailSubtitle} />

        <div className="flex flex-wrap items-center gap-3">
          <Link href="/app/medications" className="btn btn-secondary">
            {copy.common.back}
          </Link>
          <form action={triggerRefillAction}>
            <ActionSubmitButton className="btn btn-primary" type="submit" data-action-feedback={copy.common.actionCreated}>
              {copy.medicationsHub.refillTrigger}
            </ActionSubmitButton>
          </form>
        </div>

        <Card className="space-y-3">
          <div className="text-lg font-semibold text-ink">{medication.name}</div>
          <div className="text-sm text-muted">
            {medication.form ? `${medication.form} • ` : ''}{medication.strength || ''}
          </div>
          {patientLabel ? <div className="text-sm text-muted">{copy.medicationsHub.patientLabel}: {patientLabel}</div> : null}
          {medication.notes ? <div className="text-sm text-muted">{medication.notes}</div> : null}
        </Card>

        <Card className="space-y-3">
          <div className="text-lg font-semibold text-ink">{copy.medicationsHub.scheduleTitle}</div>
          {schedule ? (
            <div className="space-y-2 text-sm text-muted">
              <div>{copy.medicationsHub.scheduleTypeLabel}: {scheduleTypeLabels[schedule.schedule_type] ?? schedule.schedule_type}</div>
              <div>{copy.medicationsHub.timesLabel}: {(schedule.times_local || []).join(', ')}</div>
              <div>{copy.medicationsHub.startDateLabel}: {schedule.start_date}</div>
              {schedule.end_date ? <div>{copy.medicationsHub.endDateLabel}: {schedule.end_date}</div> : null}
              {schedule.interval_hours ? <div>{copy.medicationsHub.intervalLabel}: {schedule.interval_hours}h</div> : null}
            </div>
          ) : (
            <div className="text-sm text-muted">{copy.medicationsHub.scheduleMissing}</div>
          )}
        </Card>

        <Card className="space-y-4">
          <div className="text-lg font-semibold text-ink">{copy.medicationsHub.stockTitle}</div>
          {stock ? (
            <div className="space-y-2 text-sm text-muted">
              <div>{copy.medicationsHub.stockLabel}: {stock.quantity_on_hand} {stock.unit}</div>
              {daysLeft !== null ? <div>{copy.medicationsHub.daysLeftLabel}: {daysLeft}</div> : null}
            </div>
          ) : (
            <div className="text-sm text-muted">{copy.medicationsHub.stockMissing}</div>
          )}
          <form action={updateStockAction} className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-muted">{copy.medicationsHub.stockQuantityLabel}</label>
              <input name="quantity" type="number" min={0} className="input" defaultValue={stock?.quantity_on_hand ?? 0} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted">{copy.medicationsHub.stockUnitLabel}</label>
              <input name="unit" className="input" defaultValue={stock?.unit ?? 'pills'} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted">{copy.medicationsHub.stockDecrementLabel}</label>
              <input name="decrement_per_dose" type="number" min={1} className="input" defaultValue={stock?.decrement_per_dose ?? 1} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted">{copy.medicationsHub.stockThresholdLabel}</label>
              <input name="low_stock_threshold" type="number" min={0} className="input" defaultValue={stock?.low_stock_threshold ?? ''} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted">{copy.medicationsHub.refillLeadLabel}</label>
              <input name="refill_lead_days" type="number" min={1} className="input" defaultValue={stock?.refill_lead_days ?? 5} />
            </div>
            <label className="flex items-center gap-2 text-xs text-muted">
              <input type="checkbox" name="refill_enabled" value="1" defaultChecked={stock?.refill_enabled !== false} />
              {copy.medicationsHub.refillEnabledLabel}
            </label>
            <ActionSubmitButton className="btn btn-primary md:col-span-2" type="submit" data-action-feedback={copy.common.actionSaved}>
              {copy.medicationsHub.stockSave}
            </ActionSubmitButton>
          </form>
        </Card>

        <Card className="space-y-4">
          <div className="text-lg font-semibold text-ink">{copy.medicationsHub.caregiversTitle}</div>
          {(caregivers ?? []).length ? (
            <div className="space-y-3">
              {(caregivers ?? []).map((caregiver: any) => (
                <div key={caregiver.id} className="flex items-center justify-between rounded-xl border border-borderSubtle bg-surface p-3">
                  <div className="text-sm text-ink">
                    {memberLabels.get(caregiver.caregiver_member_id) || caregiver.caregiver_member_id}
                  </div>
                  <form action={removeCaregiverAction}>
                    <input type="hidden" name="caregiver_id" value={caregiver.id} />
                    <button type="submit" className="btn btn-secondary h-9">{copy.common.delete}</button>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted">{copy.medicationsHub.caregiversEmpty}</div>
          )}

          <form action={addCaregiverAction} className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-muted">{copy.medicationsHub.patientLabel}</label>
              <select name="patient_member_id" className="input">
                {members.map((member: any) => (
                  <option key={member.id} value={member.id}>
                    {memberLabels.get(member.id)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted">{copy.medicationsHub.caregiverLabel}</label>
              <select name="caregiver_member_id" className="input">
                {members.map((member: any) => (
                  <option key={member.id} value={member.id}>
                    {memberLabels.get(member.id)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted">{copy.medicationsHub.escalationAfterLabel}</label>
              <input name="escalation_after_minutes" type="number" min={5} className="input" defaultValue={30} />
            </div>
            <label className="flex items-center gap-2 text-xs text-muted">
              <input type="checkbox" name="can_edit" value="1" />
              {copy.medicationsHub.caregiverCanEdit}
            </label>
            <label className="flex items-center gap-2 text-xs text-muted">
              <input type="checkbox" name="escalation_enabled" value="1" defaultChecked />
              {copy.medicationsHub.escalationEnabledLabel}
            </label>
            <div className="flex flex-wrap gap-2 text-xs text-muted">
              <label className="chip flex items-center gap-1">
                <input type="checkbox" name="escalation_channels" value="push" defaultChecked />
                Push
              </label>
              <label className="chip flex items-center gap-1">
                <input type="checkbox" name="escalation_channels" value="email" />
                Email
              </label>
            </div>
            <ActionSubmitButton className="btn btn-primary md:col-span-2" type="submit" data-action-feedback={copy.common.actionSaved}>
              {copy.medicationsHub.caregiverSave}
            </ActionSubmitButton>
          </form>
        </Card>

        <Card className="space-y-3">
          <div className="text-lg font-semibold text-ink">{copy.medicationsHub.historyTitle}</div>
          {(doseHistory ?? []).length ? (
            <div className="space-y-2 text-sm text-muted">
              {(doseHistory ?? []).map((dose: any) => (
                <div key={dose.id} className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm text-ink">
                      {formatDateTimeWithTimeZone(dose.scheduled_at, medication.timezone || 'UTC')}
                    </div>
                    {dose.skipped_reason ? <div className="text-xs text-muted">{dose.skipped_reason}</div> : null}
                  </div>
                  <span className="chip">{statusLabels[dose.status] ?? dose.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted">{copy.medicationsHub.historyEmpty}</div>
          )}
        </Card>

      </div>
    </AppShell>
  );
}
