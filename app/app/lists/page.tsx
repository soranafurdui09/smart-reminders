import AppShell from '@/components/AppShell';
import { requireUser } from '@/lib/auth';
import { getUserLocale } from '@/lib/data';
import { messages } from '@/lib/i18n';
import { getTaskLists } from '@/lib/tasks';
import ListsClient from './ListsClient';

export default async function ListsPage() {
  const user = await requireUser('/app/lists');
  const locale = await getUserLocale(user.id);
  const copy = messages[locale];
  const lists = await getTaskLists(user.id);

  return (
    <AppShell locale={locale} activePath="/app/lists" userEmail={user.email}>
      <ListsClient lists={lists} />
    </AppShell>
  );
}
