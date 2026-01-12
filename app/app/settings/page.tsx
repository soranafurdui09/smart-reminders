import Link from 'next/link';
import AppShell from '@/components/AppShell';
import SectionHeader from '@/components/SectionHeader';
import PushSettings from '@/components/PushSettings';
import ActionSubmitButton from '@/components/ActionSubmitButton';
import { requireUser } from '@/lib/auth';
import { getUserLocale } from '@/lib/data';
import { getVapidPublicKey } from '@/lib/push';
import { messages } from '@/lib/i18n';
import { updateLocale } from './actions';

export default async function SettingsPage({ searchParams }: { searchParams: { updated?: string } }) {
  const user = await requireUser('/app/settings');
  const locale = await getUserLocale(user.id);
  const copy = messages[locale];
  const vapidPublicKey = getVapidPublicKey();

  return (
    <AppShell locale={locale} activePath="/app/settings" userEmail={user.email}>
      <div className="space-y-6">
        <SectionHeader title={copy.settings.title} description={copy.settings.subtitle} />
        <section className="card space-y-4 max-w-lg">
          <div>
            <div className="text-lg font-semibold text-ink">{copy.language.title}</div>
            <p className="text-sm text-muted">{copy.language.subtitle}</p>
          </div>
          {searchParams.updated ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              {copy.language.updated}
            </div>
          ) : null}
          <form action={updateLocale} className="space-y-3">
            <select name="locale" className="input" defaultValue={locale}>
              <option value="ro">{copy.language.ro}</option>
              <option value="en">{copy.language.en}</option>
            </select>
            <ActionSubmitButton className="btn btn-primary" type="submit">{copy.common.save}</ActionSubmitButton>
          </form>
        </section>
        {vapidPublicKey ? (
          <PushSettings
            vapidPublicKey={vapidPublicKey}
            copy={{
              title: copy.push.title,
              subtitle: copy.push.subtitle,
              activate: copy.push.activate,
              deactivate: copy.push.deactivate,
              enabling: copy.push.enabling,
              disabling: copy.push.disabling,
              enabled: copy.push.enabled,
              disabled: copy.push.disabled,
              notSupported: copy.push.notSupported
            }}
          />
        ) : (
          <div className="card text-sm text-muted">
            {copy.settings.pushMissing}
          </div>
        )}
        <Link className="btn btn-secondary" href="/app">{copy.common.back}</Link>
      </div>
    </AppShell>
  );
}
