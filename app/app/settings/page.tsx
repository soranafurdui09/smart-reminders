import Link from 'next/link';
import AppShell from '@/components/AppShell';
import SectionHeader from '@/components/SectionHeader';
import PushSettings from '@/components/PushSettings';
import ActionSubmitButton from '@/components/ActionSubmitButton';
import { requireUser } from '@/lib/auth';
import { getUserContextDefaults, getUserLocale } from '@/lib/data';
import { getVapidPublicKey } from '@/lib/push';
import { messages } from '@/lib/i18n';
import { updateContextDefaults, updateLocale } from './actions';
import { getUserGoogleConnection } from '@/lib/google/calendar';

export default async function SettingsPage({
  searchParams
}: {
  searchParams: { updated?: string; google?: string; context?: string };
}) {
  const user = await requireUser('/app/settings');
  const locale = await getUserLocale(user.id);
  const copy = messages[locale];
  const vapidPublicKey = getVapidPublicKey();
  const googleConnection = await getUserGoogleConnection(user.id);
  const googleStatus = searchParams.google;
  const contextDefaults = await getUserContextDefaults(user.id);
  const timeWindow = contextDefaults.timeWindow ?? { enabled: false, startHour: 9, endHour: 20, daysOfWeek: [] };
  const calendarBusy = contextDefaults.calendarBusy ?? { enabled: false, snoozeMinutes: 15 };
  const hourOptions = Array.from({ length: 24 }, (_, index) => index);
  const dayOptions: { value: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'; label: string }[] = [
    { value: 'monday', label: copy.remindersNew.contextDayMonday },
    { value: 'tuesday', label: copy.remindersNew.contextDayTuesday },
    { value: 'wednesday', label: copy.remindersNew.contextDayWednesday },
    { value: 'thursday', label: copy.remindersNew.contextDayThursday },
    { value: 'friday', label: copy.remindersNew.contextDayFriday },
    { value: 'saturday', label: copy.remindersNew.contextDaySaturday },
    { value: 'sunday', label: copy.remindersNew.contextDaySunday }
  ];

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
              <option value="de">{copy.language.de}</option>
            </select>
            <ActionSubmitButton
              className="btn btn-primary"
              type="submit"
              data-action-feedback={copy.common.actionSaved}
            >
              {copy.common.save}
            </ActionSubmitButton>
          </form>
        </section>
        <section className="card space-y-4 max-w-lg">
          <div>
            <div className="text-lg font-semibold text-ink">{copy.settings.contextTitle}</div>
            <p className="text-sm text-muted">{copy.settings.contextSubtitle}</p>
          </div>
          {searchParams.context ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              {copy.settings.contextUpdated}
            </div>
          ) : null}
          <form action={updateContextDefaults} className="space-y-4">
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="context_time_window_enabled"
                  value="1"
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
                  defaultChecked={timeWindow.enabled}
                />
                {copy.remindersNew.contextTimeWindowLabel}
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-muted">{copy.remindersNew.contextStartLabel}</label>
                  <select
                    name="context_time_start_hour"
                    className="input"
                    defaultValue={timeWindow.startHour}
                  >
                    {hourOptions.map((hour) => (
                      <option key={`start-${hour}`} value={hour}>
                        {String(hour).padStart(2, '0')}:00
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted">{copy.remindersNew.contextEndLabel}</label>
                  <select
                    name="context_time_end_hour"
                    className="input"
                    defaultValue={timeWindow.endHour}
                  >
                    {hourOptions.map((hour) => (
                      <option key={`end-${hour}`} value={hour}>
                        {String(hour).padStart(2, '0')}:00
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted">{copy.remindersNew.contextDaysLabel}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {dayOptions.map((day) => (
                    <label key={day.value} className="flex items-center gap-2 text-xs text-muted">
                      <input
                        type="checkbox"
                        name="context_time_days"
                        value={day.value}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
                        defaultChecked={timeWindow.daysOfWeek.includes(day.value)}
                      />
                      {day.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="context_calendar_busy_enabled"
                  value="1"
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
                  defaultChecked={calendarBusy.enabled}
                />
                {copy.remindersNew.contextCalendarLabel}
              </label>
              <p className="text-xs text-muted">{copy.settings.contextCalendarHint}</p>
              <div className="max-w-xs">
                <label className="text-xs font-semibold text-muted">{copy.remindersNew.contextSnoozeLabel}</label>
                <input
                  type="number"
                  name="context_calendar_snooze_minutes"
                  className="input"
                  min={5}
                  max={240}
                  defaultValue={calendarBusy.snoozeMinutes}
                />
              </div>
            </div>
            <ActionSubmitButton
              className="btn btn-primary"
              type="submit"
              data-action-feedback={copy.common.actionSaved}
            >
              {copy.common.save}
            </ActionSubmitButton>
          </form>
        </section>
        <section className="card space-y-4 max-w-lg">
          <div>
            <div className="text-lg font-semibold text-ink">{copy.settings.integrationsTitle}</div>
            <p className="text-sm text-muted">{copy.settings.integrationsSubtitle}</p>
          </div>
          {googleStatus === 'connected' ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              {copy.settings.googleCalendarConnected}
            </div>
          ) : null}
          {googleStatus === 'error' ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {copy.settings.googleCalendarError}
            </div>
          ) : null}
          <div className="space-y-2">
            <div className="text-sm font-semibold text-ink">{copy.settings.googleCalendarTitle}</div>
            <p className="text-sm text-muted">{copy.settings.googleCalendarSubtitle}</p>
          </div>
          {googleConnection ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-emerald-700">{copy.settings.googleCalendarStatus}</span>
              <Link className="btn btn-secondary" href="/api/integrations/google/calendar/connect">
                {copy.settings.googleCalendarReconnect}
              </Link>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Link className="btn btn-primary" href="/api/integrations/google/calendar/connect">
                {copy.settings.googleCalendarConnect}
              </Link>
              <span className="text-xs text-muted">{copy.settings.googleCalendarHint}</span>
            </div>
          )}
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
