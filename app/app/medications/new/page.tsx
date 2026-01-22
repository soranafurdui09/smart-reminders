import Link from 'next/link';
import AppShell from '@/components/AppShell';
import SectionHeader from '@/components/SectionHeader';
import ActionSubmitButton from '@/components/ActionSubmitButton';
import { requireUser } from '@/lib/auth';
import { getHouseholdMembers, getUserHousehold, getUserLocale, getUserTimeZone } from '@/lib/data';
import { messages } from '@/lib/i18n';
import { createMedication } from '../actions';

export default async function MedicationNewPage() {
  const user = await requireUser('/app/medications/new');
  const locale = await getUserLocale(user.id);
  const copy = messages[locale];
  const membership = await getUserHousehold(user.id);
  const members = membership?.households ? await getHouseholdMembers(membership.households.id) : [];
  const timeZone = (await getUserTimeZone(user.id)) || 'UTC';

  return (
    <AppShell locale={locale} activePath="/app/medications" userEmail={user.email}>
      <div className="space-y-8 pb-24">
        <SectionHeader title={copy.medicationsHub.createTitle} description={copy.medicationsHub.createSubtitle} />

        <form action={createMedication} className="card space-y-6">
          <input type="hidden" name="timezone" value={timeZone} />

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-semibold">{copy.remindersNew.medicationNameLabel}</label>
              <input name="name" className="input" placeholder={copy.remindersNew.medicationDosePlaceholder} required />
            </div>
            <div>
              <label className="text-sm font-semibold">{copy.medicationsHub.formLabel}</label>
              <select name="form" className="input">
                <option value="pill">{copy.medicationsHub.formPill}</option>
                <option value="capsule">{copy.medicationsHub.formCapsule}</option>
                <option value="drops">{copy.medicationsHub.formDrops}</option>
                <option value="injection">{copy.medicationsHub.formInjection}</option>
                <option value="other">{copy.medicationsHub.formOther}</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold">{copy.medicationsHub.strengthLabel}</label>
              <input name="strength" className="input" placeholder={copy.medicationsHub.strengthPlaceholder} />
            </div>
            <div>
              <label className="text-sm font-semibold">{copy.remindersNew.medicationPersonLabel}</label>
              <select name="patient_member_id" className="input">
                <option value="">{copy.remindersNew.medicationPersonSelf}</option>
                {members.map((member: any) => (
                  <option key={member.id} value={member.id}>
                    {member.profiles?.name || member.profiles?.email || member.user_id}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="text-sm font-semibold">{copy.medicationsHub.scheduleTitle}</div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-muted">{copy.medicationsHub.scheduleTypeLabel}</label>
                <select name="schedule_type" className="input">
                  <option value="daily">{copy.medicationsHub.scheduleDaily}</option>
                  <option value="weekdays">{copy.medicationsHub.scheduleWeekdays}</option>
                  <option value="custom_days">{copy.medicationsHub.scheduleCustom}</option>
                  <option value="interval">{copy.medicationsHub.scheduleInterval}</option>
                  <option value="prn">{copy.medicationsHub.schedulePrn}</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted">{copy.medicationsHub.reminderWindowLabel}</label>
                <input name="reminder_window_minutes" type="number" min={10} className="input" defaultValue={60} />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted">{copy.medicationsHub.timesLabel}</label>
              <div className="grid gap-2 md:grid-cols-4">
                {[0, 1, 2, 3].map((index) => (
                  <input key={index} name="times_local" type="time" className="input" />
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted">{copy.medicationsHub.daysLabel}</label>
              <div className="flex flex-wrap gap-2 text-xs">
                {copy.medicationsHub.weekdaysShort.map((label: string, idx: number) => (
                  <label key={label} className="chip flex items-center gap-1">
                    <input type="checkbox" name="days_of_week" value={idx} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-muted">{copy.medicationsHub.startDateLabel}</label>
                <input name="start_date" type="date" className="input" required />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted">{copy.medicationsHub.endDateLabel}</label>
                <input name="end_date" type="date" className="input" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted">{copy.medicationsHub.intervalLabel}</label>
                <input name="interval_hours" type="number" min={1} className="input" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted">{copy.medicationsHub.doseLabel}</label>
                <div className="flex gap-2">
                  <input name="dose_amount" type="number" min={0} className="input" />
                  <input name="dose_unit" className="input" placeholder={copy.medicationsHub.doseUnitPlaceholder} />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="text-sm font-semibold">{copy.medicationsHub.stockTitle}</div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-muted">{copy.medicationsHub.stockQuantityLabel}</label>
                <input name="stock_quantity" type="number" min={0} className="input" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted">{copy.medicationsHub.stockUnitLabel}</label>
                <input name="stock_unit" className="input" placeholder="pills" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted">{copy.medicationsHub.stockDecrementLabel}</label>
                <input name="stock_decrement" type="number" min={1} className="input" defaultValue={1} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted">{copy.medicationsHub.stockThresholdLabel}</label>
                <input name="low_stock_threshold" type="number" min={0} className="input" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted">{copy.medicationsHub.refillLeadLabel}</label>
                <input name="refill_lead_days" type="number" min={1} className="input" defaultValue={5} />
              </div>
              <label className="flex items-center gap-2 text-xs text-muted">
                <input type="checkbox" name="refill_enabled" value="1" defaultChecked />
                {copy.medicationsHub.refillEnabledLabel}
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <ActionSubmitButton className="btn btn-primary" type="submit" data-action-feedback={copy.common.actionCreated}>
              {copy.medicationsHub.createButton}
            </ActionSubmitButton>
            <Link href="/app/medications" className="btn btn-secondary">
              {copy.common.back}
            </Link>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
