import webpush from 'web-push';
import { getOptionalEnv } from './env';

type PushRecord = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

type SendPushResult = { status: 'sent' | 'skipped' | 'failed'; staleEndpoints: string[] };

function getVapidConfig() {
  const publicKey = getOptionalEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY');
  const privateKey = getOptionalEnv('VAPID_PRIVATE_KEY');
  const subject = getOptionalEnv('VAPID_SUBJECT');
  if (!publicKey || !privateKey || !subject) {
    return null;
  }
  return { publicKey, privateKey, subject };
}

export function getVapidPublicKey() {
  return getOptionalEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY');
}

export function isPushConfigured() {
  return Boolean(getVapidConfig());
}

export async function sendPushNotification(subscriptions: PushRecord[], payload: Record<string, unknown>): Promise<SendPushResult> {
  const config = getVapidConfig();
  if (!config) {
    console.log('[notifications] push skipped (VAPID not configured)');
    return { status: 'skipped', staleEndpoints: [] };
  }
  if (!subscriptions.length) {
    console.log('[notifications] push skipped (no subscriptions)');
    return { status: 'skipped', staleEndpoints: [] };
  }

  console.log('[notifications] sending push', { count: subscriptions.length });
  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
  const staleEndpoints: string[] = [];
  let failed = false;

  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth
          }
        },
        JSON.stringify(payload)
      );
    } catch (error: any) {
      const statusCode = error?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        staleEndpoints.push(subscription.endpoint);
      } else {
        failed = true;
        console.error('[notifications] push failed', error);
      }
    }
  }

  return { status: failed ? 'failed' : 'sent', staleEndpoints };
}
