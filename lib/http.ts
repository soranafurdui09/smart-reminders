import { headers } from 'next/headers';
import { getRequiredEnv } from './env';

function normalizeHost(host: string) {
  if (host.startsWith('0.0.0.0')) {
    return host.replace('0.0.0.0', 'localhost');
  }
  if (host.startsWith('[::]')) {
    return host.replace('[::]', 'localhost');
  }
  return host;
}

export function getRequestOrigin() {
  const headerList = headers();
  const forwardedHost = headerList.get('x-forwarded-host');
  const host = normalizeHost(forwardedHost ?? headerList.get('host') ?? '');
  const proto = headerList.get('x-forwarded-proto') ?? 'http';
  if (host) {
    return `${proto}://${host}`;
  }
  return getRequiredEnv('NEXT_PUBLIC_APP_URL');
}

export function getSafeNextPath(next: string | null) {
  if (!next) {
    return '/app';
  }
  if (!next.startsWith('/') || next.startsWith('/auth')) {
    return '/app';
  }
  return next;
}
