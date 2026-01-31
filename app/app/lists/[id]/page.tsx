import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { requireUser } from '@/lib/auth';
import { getUserLocale } from '@/lib/data';
import { getTaskItemsForList, getTaskLists } from '@/lib/tasks';
import ListDetailClient from './ListDetailClient';

export default async function ListDetailPage({ params }: { params: { id: string } }) {
  const user = await requireUser(`/app/lists/${params.id}`);
  const locale = await getUserLocale(user.id);
  const lists = await getTaskLists(user.id);
  const list = lists.find((entry) => entry.id === params.id) || null;

  if (!list) {
    return (
      <AppShell locale={locale} activePath="/app/lists" userEmail={user.email}>
        <div className="page-wrap space-y-4">
          <h1 className="text-xl font-semibold text-ink">Listă indisponibilă</h1>
          <p className="text-sm text-muted">Lista nu există sau nu ai acces.</p>
          <Link className="btn btn-secondary" href="/app/lists">Înapoi la liste</Link>
        </div>
      </AppShell>
    );
  }

  const items = await getTaskItemsForList(user.id, list.id, { status: 'all' });

  return (
    <AppShell locale={locale} activePath="/app/lists" userEmail={user.email}>
      <ListDetailClient list={list} items={items} />
    </AppShell>
  );
}
