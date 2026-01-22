import AppShell from '@/components/AppShell';
import SectionHeader from '@/components/SectionHeader';
import Card from '@/components/ui/Card';
import MedicationDoseList, { type MedicationDoseRow } from '@/components/medications/MedicationDoseList';
import { requireUser } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { getHouseholdMembers, getUserHousehold, getUserLocale, getUserTimeZone } from '@/lib/data';
import { messages } from '@/lib/i18n';

export default async function MedicationCaregiverPage() {
  const user = await requireUser('/app/medications/caregiver');
  const locale = await getUserLocale(user.id);
  const copy = messages[locale];
  const membership = await getUserHousehold(user.id);

  if (!membership?.households) {
    return (
      <AppShell locale={locale} activePath="/app/medications" userEmail={user.email}>
        <div className="space-y-6 pb-24">
          <SectionHeader title={copy.medicationsHub.caregiverDashboard} description={copy.medicationsHub.caregiverDashboardSubtitle} />
          <div className="card text-sm text-muted">{copy.medicationsHub.noHousehold}</div>
        </div>
      </AppShell>
    );
  }

  const supabase = createServerClient();
  const timeZone = (await getUserTimeZone(user.id)) || 'UTC';
  const { data: caregiverLinks } = await supabase
    .from('medication_caregivers')
    .select('id, patient_member_id, caregiver_member_id, can_edit')
    .eq('caregiver_member_id', membership.id);

  const patientIds = (caregiverLinks ?? []).map((row: any) => row.patient_member_id);
  const { data: doses } = patientIds.length
    ? await supabase
        .from('medication_doses')
        .select('id, scheduled_at, status, skipped_reason, taken_at, snoozed_until, patient_member_id, medication:medications!inner(id, name, household_id)')
        .in('patient_member_id', patientIds)
        .in('status', ['pending', 'missed'])
        .order('scheduled_at')
    : { data: [] };

  const members = await getHouseholdMembers(membership.households.id);
  const memberLabels = new Map(
    members.map((member: any) => [member.id, member.profiles?.name || member.profiles?.email || member.user_id])
  );
  const canEditMap = new Map(
    (caregiverLinks ?? []).map((row: any) => [row.patient_member_id, row.can_edit])
  );

  const doseRows: MedicationDoseRow[] = (doses ?? []).map((dose: any) => ({
    ...dose,
    medication: Array.isArray(dose.medication) ? dose.medication[0] ?? null : dose.medication ?? null
  }));

  return (
    <AppShell locale={locale} activePath="/app/medications" userEmail={user.email}>
      <div className="space-y-8 pb-24">
        <SectionHeader title={copy.medicationsHub.caregiverDashboard} description={copy.medicationsHub.caregiverDashboardSubtitle} />

        <Card className="space-y-4">
          <div className="text-lg font-semibold text-ink">{copy.medicationsHub.needsAttention}</div>
          {doseRows.length ? (
            <MedicationDoseList
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
                missed: copy.medicationsHub.status_missed
              }}
              canEditByDose={(dose) => Boolean(canEditMap.get(dose.patient_member_id as string))}
            />
          ) : (
            <div className="text-sm text-muted">{copy.medicationsHub.caregiverDashboardEmpty}</div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
