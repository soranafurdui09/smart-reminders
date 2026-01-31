import AppShell from '@/components/AppShell';
import { requireUser } from '@/lib/auth';
import { getHouseholdMembers, getUserHousehold, getUserLocale } from '@/lib/data';
import { getTaskListsForHousehold } from '@/lib/tasks';
import ListsClient from './ListsClient';

export default async function ListsPage() {
  const user = await requireUser('/app/lists');
  const locale = await getUserLocale(user.id);
  const membership = await getUserHousehold(user.id);
  const members = membership?.households ? await getHouseholdMembers(membership.households.id) : [];
  const lists = await getTaskListsForHousehold(user.id, membership?.households?.id ?? null);

  return (
    <AppShell locale={locale} activePath="/app/lists" userEmail={user.email}>
      <ListsClient
        lists={lists}
        members={members.map((member: any) => ({
          id: member.id,
          label: member.profiles?.name || member.profiles?.email || member.user_id
        }))}
      />
    </AppShell>
  );
}
