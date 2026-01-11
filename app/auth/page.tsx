import Link from 'next/link';
import SubmitButton from '@/components/SubmitButton';
import AuthRedirect from '@/components/AuthRedirect';
import MagicLinkForm from '@/components/MagicLinkForm';
import { getLocaleFromCookie, messages } from '@/lib/i18n';
import { signInWithGoogle } from './actions';

export const dynamic = 'force-dynamic';

export default async function AuthPage({ searchParams }: { searchParams: { [key: string]: string | undefined } }) {
  const locale = getLocaleFromCookie();
  const copy = messages[locale];
  const checkEmail = searchParams['check-email'] === '1';
  const error = searchParams['error'];
  const nextParam = searchParams['next'];
  const next = typeof nextParam === 'string' && nextParam.startsWith('/') && !nextParam.startsWith('/auth')
    ? nextParam
    : '/app';
  const errorMessage = error === 'oauth-not-configured'
    ? copy.auth.errorOauthNotConfigured
    : error === 'missing-email'
      ? copy.auth.errorMissingEmail
        : error
          ? copy.auth.errorGeneric
          : null;
  if (process.env.NODE_ENV === 'development') {
    console.log('[auth] render', { next, hasError: Boolean(error), checkEmail });
  }
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <AuthRedirect next={next} />
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-10">
        <Link href="/" className="text-sm text-slate-500">{copy.auth.back}</Link>
        <h1 className="mt-6 text-2xl font-semibold">{copy.auth.title}</h1>
        <p className="text-sm text-slate-500">{copy.auth.subtitle}</p>
        {checkEmail ? (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            {copy.auth.checkEmail}
          </div>
        ) : null}
        {errorMessage ? (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        <MagicLinkForm
          next={next}
          className="mt-6"
          copy={{
            placeholder: copy.magicLink.placeholder,
            sending: copy.magicLink.sending,
            button: copy.magicLink.button,
            invalidEmail: copy.magicLink.invalidEmail,
            emailSent: copy.magicLink.emailSent,
            failedSend: copy.magicLink.failedSend,
            errorGeneric: copy.auth.errorGeneric
          }}
        />

        <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          {copy.auth.or}
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <form action={signInWithGoogle} className="space-y-3">
          <input type="hidden" name="next" value={next} />
          <SubmitButton label={copy.auth.googleButton} loading={copy.auth.redirecting} className="btn btn-secondary w-full" />
        </form>
      </div>
    </main>
  );
}
