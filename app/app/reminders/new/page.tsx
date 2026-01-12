import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { requireUser } from '@/lib/auth';
import { getHouseholdMembers, getUserHousehold, getUserLocale } from '@/lib/data';
import { messages } from '@/lib/i18n';
import { createReminder } from './actions';
import ReminderForm from './ReminderForm';

export default async function NewReminderPage({
  searchParams
}: {
  searchParams: { error?: string };
}) {
  const user = await requireUser('/app/reminders/new');
  const locale = await getUserLocale(user.id);
  const copy = messages[locale];
  const membership = await getUserHousehold(user.id);

  if (!membership?.households) {
    return (
      <AppShell locale={locale} activePath="/app/reminders/new" userEmail={user.email}>
        <div className="space-y-4">
          <h1>{copy.remindersNew.title}</h1>
          <p className="text-sm text-muted">{copy.history.noHousehold}</p>
          <Link href="/app" className="btn btn-primary">{copy.history.createHousehold}</Link>
        </div>
      </AppShell>
    );
  }

  const membersRaw = await getHouseholdMembers(membership.households.id);
  const members = membersRaw.map((member: any) => ({
    id: member.id,
    label: member.profiles?.name || member.profiles?.email || member.user_id
  }));

  return (
    <AppShell locale={locale} activePath="/app/reminders/new" userEmail={user.email}>
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1>{copy.remindersNew.title}</h1>
            <p className="text-sm text-muted">{copy.remindersNew.subtitle}</p>
          </div>
          <Link href="/app" className="btn btn-secondary">{copy.common.back}</Link>
        </div>

        {searchParams.error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {copy.remindersNew.error}
          </div>
        ) : null}

        <ReminderForm
          action={createReminder}
          copy={copy}
          householdId={membership.households.id}
          members={members}
          locale={locale}
        />
      </div>
    </AppShell>
  );
}
