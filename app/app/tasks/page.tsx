import AppShell from '@/components/AppShell';
import { requireUser } from '@/lib/auth';
import { getUserLocale } from '@/lib/data';
import { messages } from '@/lib/i18n';
import { getOrCreateInboxList, getTaskItemsForList, getTaskLists } from '@/lib/tasks';
import TasksClient from './TasksClient';

export default async function TasksPage() {
  const user = await requireUser('/app/tasks');
  const locale = await getUserLocale(user.id);
  const copy = messages[locale];
  const inbox = await getOrCreateInboxList(user.id);
  const [lists, items] = await Promise.all([
    getTaskLists(user.id),
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
