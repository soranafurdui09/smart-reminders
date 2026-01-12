import Link from 'next/link';
import AuthRedirect from '@/components/AuthRedirect';
import MagicLinkForm from '@/components/MagicLinkForm';
import { getLocaleFromCookie, messages } from '@/lib/i18n';
import GoogleOAuthButton from '@/components/GoogleOAuthButton';

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
    <main className="min-h-screen">
      <AuthRedirect next={next} />
      <div className="page-wrap flex min-h-screen items-center">
        <div className="mx-auto w-full max-w-lg space-y-6">
          <Link href="/" className="text-sm text-muted">{copy.auth.back}</Link>
          <div className="card space-y-6">
            <div className="space-y-2">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primaryStrong via-primary to-accent text-base font-semibold text-white">
                RI
              </div>
              <h1>{copy.auth.title}</h1>
              <p className="text-sm text-muted">{copy.auth.subtitle}</p>
            </div>
            {checkEmail ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                {copy.auth.checkEmail}
              </div>
            ) : null}
            {errorMessage ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                {errorMessage}
              </div>
            ) : null}

            <MagicLinkForm
              next={next}
              className=""
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

            <div className="flex items-center gap-3 text-xs text-muted">
              <span className="h-px flex-1 bg-border-subtle" />
              {copy.auth.or}
              <span className="h-px flex-1 bg-border-subtle" />
            </div>

            <GoogleOAuthButton
              next={next}
              label={copy.auth.googleButton}
              loading={copy.auth.redirecting}
              errorNotConfigured={copy.auth.errorOauthNotConfigured}
              errorGeneric={copy.auth.errorGeneric}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
