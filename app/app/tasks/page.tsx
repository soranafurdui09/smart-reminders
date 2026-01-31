import AppShell from '@/components/AppShell';
import { requireUser } from '@/lib/auth';
import { getUserHousehold, getUserLocale } from '@/lib/data';
import { getOrCreateInboxList, getTaskItemsForList, getTaskListsForHousehold } from '@/lib/tasks';
import TasksClient from './TasksClient';

export default async function TasksPage() {
  const user = await requireUser('/app/tasks');
  const locale = await getUserLocale(user.id);
  const membership = await getUserHousehold(user.id);
  const inbox = await getOrCreateInboxList(user.id, membership?.households?.id ?? null);
  const [lists, items] = await Promise.all([
    getTaskListsForHousehold(user.id, membership?.households?.id ?? null),
    getTaskItemsForList(user.id, inbox.id, { status: 'all' })
  ]);

  return (
    <AppShell locale={locale} activePath="/app/tasks" userEmail={user.email}>
      <TasksClient
        inbox={inbox}
        lists={lists}
        items={items}
      />
    </AppShell>
  );
}
