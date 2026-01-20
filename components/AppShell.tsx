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
    { href: '/app/household', label: copy.nav.household },
    { href: '/app/settings', label: copy.nav.settings }
  ];
  const safeEmail = userEmail || '';
  const userInitial = safeEmail.trim().charAt(0).toUpperCase() || 'U';
  return (
    <div className="min-h-screen bg-slate-50 bg-[radial-gradient(circle_at_top,_#dbeafe_0,_transparent_55%)] dark:bg-[#05060a] dark:bg-[radial-gradient(circle_at_top,_#0b1326_0,_transparent_55%)]">
      <NativeAppChrome />
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
      <WebViewNotice />
      <main className="page-wrap app-content">{children}</main>
      <TimeZoneSync />
      <NativeNotificationSync />
      <VoiceCreateToast copy={copy} locale={locale} undoAction={deleteReminder} />
      <ActionFeedback />
    </div>
  );
}
