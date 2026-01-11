import Link from 'next/link';
import AppShell from '@/components/AppShell';
import SectionHeader from '@/components/SectionHeader';
import { requireUser } from '@/lib/auth';
import { getUserLocale } from '@/lib/data';
import { messages } from '@/lib/i18n';
import { createReminder } from './actions';

export default async function NewReminderPage({
  searchParams
}: {
  searchParams: { error?: string };
}) {
  const user = await requireUser('/app/reminders/new');
  const locale = await getUserLocale(user.id);
  const copy = messages[locale];

  return (
    <AppShell locale={locale}>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{copy.remindersNew.title}</h1>
            <p className="text-sm text-slate-500">{copy.remindersNew.subtitle}</p>
          </div>
          <Link href="/app" className="btn btn-secondary">{copy.common.back}</Link>
        </div>

        {searchParams.error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {copy.remindersNew.error}
          </div>
        ) : null}

        <section>
          <SectionHeader title={copy.remindersNew.details} />
          <form action={createReminder} className="card space-y-4 max-w-xl">
            <div>
              <label className="text-sm font-semibold">{copy.remindersNew.titleLabel}</label>
              <input name="title" className="input" placeholder={copy.remindersNew.titlePlaceholder} required />
            </div>
            <div>
              <label className="text-sm font-semibold">{copy.remindersNew.notesLabel}</label>
              <textarea name="notes" className="input" rows={3} placeholder={copy.remindersNew.notesPlaceholder} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-semibold">{copy.remindersNew.dateLabel}</label>
                <input name="due_at" type="datetime-local" className="input" />
              </div>
              <div>
                <label className="text-sm font-semibold">{copy.remindersNew.repeatLabel}</label>
                <select name="schedule_type" className="input">
                  <option value="once">{copy.remindersNew.once}</option>
                  <option value="daily">{copy.remindersNew.daily}</option>
                  <option value="weekly">{copy.remindersNew.weekly}</option>
                  <option value="monthly">{copy.remindersNew.monthly}</option>
                </select>
              </div>
            </div>
            <button className="btn btn-primary" type="submit">{copy.remindersNew.create}</button>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
