import { Resend } from 'resend';
import { getOptionalEnv, getRequiredEnv } from './env';

type SendEmailResult = { status: 'sent' | 'skipped' | 'failed'; error?: string };

function getResendClient() {
  const apiKey = getOptionalEnv('RESEND_API_KEY');
  if (!apiKey) {
    return null;
  }
  return new Resend(apiKey);
}

export function isResendConfigured() {
  return Boolean(getOptionalEnv('RESEND_API_KEY') && getOptionalEnv('RESEND_FROM'));
}

export function getAppUrl() {
  return getRequiredEnv('NEXT_PUBLIC_APP_URL');
}

export async function sendEmail(params: { to: string; subject: string; html: string }): Promise<SendEmailResult> {
  const resend = getResendClient();
  const from = getOptionalEnv('RESEND_FROM');
  if (!resend || !from) {
    return { status: 'skipped' };
  }
  try {
    await resend.emails.send({ from, to: params.to, subject: params.subject, html: params.html });
    return { status: 'sent' };
  } catch (error) {
    return { status: 'failed', error: error instanceof Error ? error.message : 'unknown' };
  }
}
