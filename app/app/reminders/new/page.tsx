import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { requireUser } from '@/lib/auth';
import { getHouseholdMembers, getUserContextDefaults, getUserHousehold, getUserLocale } from '@/lib/data';
import { messages } from '@/lib/i18n';
import { createReminder } from './actions';
import ReminderNewClient from './ReminderNewClient';
import { getUserGoogleConnection } from '@/lib/google/calendar';

export default async function NewReminderPage({
  searchParams
}: {
  searchParams: { error?: string; voice?: string };
}) {
  const user = await requireUser('/app/reminders/new');
  const locale = await getUserLocale(user.id);
  const copy = messages[locale];
  const membership = await getUserHousehold(user.id);
  const googleConnection = await getUserGoogleConnection(user.id);
  const contextDefaults = await getUserContextDefaults(user.id);

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
      <ReminderNewClient
        action={createReminder}
        copy={copy}
        householdId={membership.households.id}
        members={members}
        locale={locale}
        googleConnected={Boolean(googleConnection)}
        error={searchParams.error}
        autoVoice={searchParams.voice === '1' || searchParams.voice === 'true'}
        contextDefaults={contextDefaults}
      />
    </AppShell>
  );
}
