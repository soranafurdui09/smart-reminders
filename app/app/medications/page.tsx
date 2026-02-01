import Link from 'next/link';
import AppShell from '@/components/AppShell';
import SectionHeader from '@/components/SectionHeader';
import Card from '@/components/ui/Card';
import MedicationDoseSection from '@/components/medications/MedicationDoseSection';
import type { MedicationDoseRow } from '@/components/medications/MedicationDoseList';
import MedicationCardActions from '@/components/medications/MedicationCardActions';
import { requireUser } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { getUserHousehold, getUserLocale, getUserTimeZone } from '@/lib/data';
import { messages } from '@/lib/i18n';
import { getUtcDayBounds } from '@/lib/time/schedule';
import { formatDateTimeWithTimeZone } from '@/lib/dates';

export default async function MedicationsPage() {
  const user = await requireUser('/app/medications');
  const locale = await getUserLocale(user.id);
  const copy = messages[locale];
  const membership = await getUserHousehold(user.id);

  if (!membership?.households) {
    return (
      <AppShell locale={locale} activePath="/app/medications" userEmail={user.email}>
        <div className="space-y-6 pb-24">
          <SectionHeader title={copy.medicationsHub.title} description={copy.medicationsHub.subtitle} />
          <div className="card text-sm text-muted">{copy.medicationsHub.noHousehold}</div>
        </div>
      </AppShell>
    );
  }

  const supabase = createServerClient();
  const timeZone = (await getUserTimeZone(user.id)) || 'UTC';
  const { start, end } = getUtcDayBounds(new Date(), timeZone);

  const { data: doses } = await supabase
    .from('medication_doses')
    .select('id, scheduled_at, status, skipped_reason, taken_at, snoozed_until, medication:medications!inner(id, name, household_id)')
    .eq('medication.household_id', membership.households.id)
    .gte('scheduled_at', start.toISOString())
    .lte('scheduled_at', end.toISOString())
    .order('scheduled_at');

  const { data: meds } = await supabase
    .from('medications')
    .select('id, name, form, patient_member_id, is_active')
    .eq('household_id', membership.households.id)
    .order('created_at', { ascending: false });

  const medIds = (meds ?? []).map((med: any) => med.id);
  const { data: stocks } = medIds.length
    ? await supabase
        .from('medication_stock')
        .select('medication_id, quantity_on_hand, unit, low_stock_threshold')
        .in('medication_id', medIds)
    : { data: [] };

  const nowIso = new Date().toISOString();
  const { data: upcomingDoses } = medIds.length
    ? await supabase
        .from('medication_doses')
        .select('id, medication_id, scheduled_at, status')
        .in('medication_id', medIds)
        .eq('status', 'pending')
        .gte('scheduled_at', nowIso)
        .order('scheduled_at', { ascending: true })
    : { data: [] };

  const stockMap = new Map((stocks ?? []).map((stock: any) => [stock.medication_id, stock]));
  const nextDoseMap = new Map<string, string>();
  (upcomingDoses ?? []).forEach((dose: any) => {
    if (!dose?.medication_id || !dose?.scheduled_at) return;
    if (!nextDoseMap.has(dose.medication_id)) {
      nextDoseMap.set(dose.medication_id, dose.scheduled_at);
    }
  });

  const doseRows: MedicationDoseRow[] = (doses ?? []).map((dose: any) => ({
    ...dose,
    medication: Array.isArray(dose.medication) ? dose.medication[0] ?? null : dose.medication ?? null
  }));

  return (
    <AppShell locale={locale} activePath="/app/medications" userEmail={user.email}>
      <div className="space-y-8 pb-24">
        <SectionHeader title={copy.medicationsHub.title} description={copy.medicationsHub.subtitle} />

        <div className="flex flex-wrap items-center gap-3">
          <Link href="/app/medications/new" className="btn btn-primary">
            {copy.medicationsHub.addButton}
          </Link>
          <Link href="/app/medications/caregiver" className="btn btn-secondary">
            {copy.medicationsHub.caregiverDashboard}
          </Link>
        </div>

        <section className="space-y-3">
          <div>
            <div className="text-lg font-semibold text-ink">{copy.medicationsHub.todayTitle}</div>
            <p className="text-sm text-muted">{copy.medicationsHub.todaySubtitle}</p>
          </div>
          <Card className="space-y-3">
            {doseRows.length ? (
              <MedicationDoseSection
                doses={doseRows}
                locale={locale}
                timeZone={timeZone}
                labels={{
                  taken: copy.medicationsHub.taken,
                  skipped: copy.medicationsHub.skipped,
                  skip: copy.medicationsHub.skip,
                  snooze: copy.medicationsHub.snooze,
                  skipPrompt: copy.medicationsHub.skipReasonPrompt,
                  skipReasonDefault: copy.medicationsHub.skipReasonForgot,
                  pending: copy.medicationsHub.status_pending,
                  missed: copy.medicationsHub.status_missed,
                  showAll: copy.medicationsHub.showAllDoses,
                  showLess: copy.medicationsHub.showLessDoses
                }}
              />
            ) : (
              <div className="text-sm text-muted">{copy.medicationsHub.todayEmpty}</div>
            )}
          </Card>
        </section>

        <section className="space-y-4">
          <div className="text-lg font-semibold text-ink">{copy.medicationsHub.listTitle}</div>
          {(meds ?? []).length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {(meds ?? []).map((med: any) => {
                if (!med?.id) {
                  return null;
                }
                const stock = stockMap.get(med.id);
                const stockQty = stock ? Number(stock.quantity_on_hand ?? 0) : null;
                const isLow = typeof stock?.low_stock_threshold === 'number' && Number(stock.quantity_on_hand) <= Number(stock.low_stock_threshold);
                const isOutOfStock = stockQty !== null && stockQty <= 0;
                const nextDose = nextDoseMap.get(med.id);
                const nextDoseLabel = nextDose ? formatDateTimeWithTimeZone(nextDose, timeZone) : copy.medicationsHub.nextDoseMissing;
                return (
                  <Card key={med.id} className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-base font-semibold text-ink">{med.name}</div>
                        {med.form ? <div className="text-xs text-muted">{med.form}</div> : null}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {isLow ? <span className="chip text-rose-200">{copy.medicationsHub.lowStock}</span> : null}
                        <MedicationCardActions
                          medicationId={med.id}
                          editHref={`/app/medications/${med.id}`}
                          labels={{
                            edit: copy.common.edit,
                            delete: copy.common.delete,
                            confirmDelete: copy.medicationsHub.deleteConfirm,
                            deleteError: copy.medicationsHub.deleteError
                          }}
                        />
                      </div>
                    </div>
                    <div className="space-y-1 text-[11px] text-muted">
                      {stock ? (
                        <div className={isOutOfStock ? 'font-semibold text-rose-200' : ''}>
                          {copy.medicationsHub.stockLabel}: {stock.quantity_on_hand} {stock.unit}
                          {isOutOfStock ? (
                            <Link
                              href={`/app/medications/${med.id}`}
                              className="ml-2 text-[10px] font-semibold text-rose-200/90 underline-offset-4 hover:underline"
                            >
                              {copy.medicationsHub.refillLink}
                            </Link>
                          ) : null}
                        </div>
                      ) : (
                        <div>{copy.medicationsHub.stockMissing}</div>
                      )}
                      <div>
                        {copy.medicationsHub.nextDoseLabel}: {nextDoseLabel}
                      </div>
                    </div>
                    <Link href={`/app/medications/${med.id}`} className="text-xs font-semibold text-[color:rgb(var(--accent))]">
                      {copy.medicationsHub.viewDetails}
                    </Link>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-muted">{copy.medicationsHub.listEmpty}</div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
