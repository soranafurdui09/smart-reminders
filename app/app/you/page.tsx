import Link from 'next/link';
import AppShell from '@/components/AppShell';
import SectionHeader from '@/components/SectionHeader';
import Card from '@/components/ui/Card';
import { requireUser } from '@/lib/auth';
import { getUserLocale } from '@/lib/data';
import { messages } from '@/lib/i18n';

export default async function YouPage() {
  const user = await requireUser('/app/you');
  const locale = await getUserLocale(user.id);
  const copy = messages[locale];
  const email = user.email || '';

  return (
    <AppShell locale={locale} activePath="/app/you" userEmail={email}>
      <div className="space-y-8 pb-24">
        <SectionHeader title={copy.you.title} description={copy.you.subtitle} />

        <Card className="space-y-3">
          <div className="text-lg font-semibold text-ink">{email || copy.common.profile}</div>
          <div className="text-sm text-muted">{copy.common.profile}</div>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Link href="/app/medications" className="card flex items-center justify-between">
            <span className="text-sm font-semibold text-ink">{copy.you.medications}</span>
            <span className="text-xs text-muted">→</span>
          </Link>
          <Link href="/app/household" className="card flex items-center justify-between">
            <span className="text-sm font-semibold text-ink">{copy.you.household}</span>
            <span className="text-xs text-muted">→</span>
          </Link>
          <Link href="/app/history" className="card flex items-center justify-between">
            <span className="text-sm font-semibold text-ink">{copy.you.history}</span>
            <span className="text-xs text-muted">→</span>
          </Link>
          <Link href="/app/settings" className="card flex items-center justify-between">
            <span className="text-sm font-semibold text-ink">{copy.you.settings}</span>
            <span className="text-xs text-muted">→</span>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
