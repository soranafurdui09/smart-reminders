import { ReactNode } from 'react';
import { defaultLocale, messages, type Locale } from '@/lib/i18n';
import ActionFeedback from '@/components/ActionFeedback';
import VoiceCreateToast from '@/components/VoiceCreateToast';
import { deleteReminder } from '@/app/app/reminders/[id]/actions';
import TimeZoneSync from '@/components/TimeZoneSync';
import NativeNotificationSync from '@/components/NativeNotificationSync';
import AppNavigation from '@/components/AppNavigation';
import NativeAppChrome from '@/components/NativeAppChrome';
import WebViewNotice from '@/components/WebViewNotice';
import MobileShell from '@/components/mobile/MobileShell';

export default function AppShell({
  children,
  locale = defaultLocale,
  activePath,
  userEmail
}: {
  children: ReactNode;
  locale?: Locale;
  activePath?: string;
  userEmail?: string | null;
}) {
  const copy = messages[locale];
  const navLinks = [
    { href: '/app', label: copy.nav.dashboard },
    { href: '/app/reminders/new', label: copy.nav.newReminder },
    { href: '/app/calendar', label: copy.nav.calendar },
    { href: '/app/history', label: copy.nav.history },
    { href: '/app/you', label: copy.nav.you },
    { href: '/app/settings', label: copy.nav.settings }
  ];
  const safeEmail = userEmail || '';
  const userInitial = safeEmail.trim().charAt(0).toUpperCase() || 'U';
  return (
    <div className="min-h-screen bg-app text-ink">
      <NativeAppChrome />
      <MobileShell
        header={
          <AppNavigation
            navLinks={navLinks}
            activePath={activePath}
            appName={copy.appName}
            userInitial={userInitial}
            userEmail={safeEmail}
            voiceLabel={copy.remindersNew.voiceNavLabel}
            profileLabel={copy.common.profile}
            logoutLabel={copy.nav.logout}
            comingSoonLabel={copy.common.comingSoon}
          />
        }
        labels={{
          today: copy.nav.today,
          inbox: copy.nav.inbox,
          calendar: copy.nav.calendar,
          you: copy.nav.you
        }}
      >
        <WebViewNotice />
        {children}
      </MobileShell>
      <TimeZoneSync />
      <NativeNotificationSync />
      <VoiceCreateToast copy={copy} locale={locale} undoAction={deleteReminder} />
      <ActionFeedback />
    </div>
  );
}
