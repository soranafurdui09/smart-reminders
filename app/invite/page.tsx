import Link from 'next/link';
import SectionHeader from '@/components/SectionHeader';
import { createServerClient } from '@/lib/supabase/server';
import { getUserLocale } from '@/lib/data';
import { getLocaleFromCookie, messages } from '@/lib/i18n';
import { acceptInvite } from '@/app/app/household/actions';

export default async function InvitePage({ searchParams }: { searchParams: { token?: string } }) {
  const fallbackLocale = getLocaleFromCookie();
  const token = searchParams.token;
  if (!token) {
    const copy = messages[fallbackLocale];
    return (
      <div className="mx-auto max-w-lg px-6 py-10">
        <SectionHeader title={copy.invite.title} description={copy.invite.missingToken} />
        <Link className="btn btn-secondary" href="/app">{copy.common.back}</Link>
      </div>
    );
  }

  const supabase = createServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    const loginNext = `/invite?token=${encodeURIComponent(token)}`;
    const copy = messages[fallbackLocale];
    return (
      <div className="mx-auto max-w-lg px-6 py-10">
        <SectionHeader title={copy.invite.title} description={copy.invite.loginRequired} />
        <Link className="btn btn-primary" href={`/auth?next=${encodeURIComponent(loginNext)}`}>
          {copy.invite.login}
        </Link>
      </div>
    );
  }

  const user = data.user;
  const locale = await getUserLocale(user.id);
  const copy = messages[locale];
  let statusKey: 'accepted' | 'invalid' | 'expired' | 'alreadyAccepted' = 'accepted';

  try {
    await acceptInvite(token, user.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    statusKey = message === 'Expired'
      ? 'expired'
      : message === 'Already accepted'
        ? 'alreadyAccepted'
        : 'invalid';
  }
  const statusText = statusKey === 'accepted'
    ? copy.invite.accepted
    : statusKey === 'expired'
      ? copy.invite.expired
      : statusKey === 'alreadyAccepted'
        ? copy.invite.alreadyAccepted
        : copy.invite.invalid;

  return (
    <div className="mx-auto max-w-lg px-6 py-10">
      <SectionHeader title={copy.invite.title} description={statusText} />
      <Link className="btn btn-primary" href="/app">{copy.invite.goDashboard}</Link>
    </div>
  );
}
