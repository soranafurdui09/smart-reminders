import Link from 'next/link';
import AppShell from '@/components/AppShell';
import SectionHeader from '@/components/SectionHeader';
import { requireUser } from '@/lib/auth';
import { getUserLocale } from '@/lib/data';
import { messages } from '@/lib/i18n';

export default async function BillingPage() {
  const user = await requireUser('/app/billing');
  const locale = await getUserLocale(user.id);
  const copy = messages[locale];

  return (
    <AppShell locale={locale} activePath="/app/billing" userEmail={user.email}>
      <div className="space-y-6">
        <SectionHeader title={copy.billing.title} description={copy.billing.subtitle} />
        <Link className="btn btn-secondary" href="/app">{copy.common.back}</Link>
      </div>
    </AppShell>
  );
}
