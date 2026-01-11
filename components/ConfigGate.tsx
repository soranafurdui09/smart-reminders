import type { ReactNode } from 'react';
import ConfigError from '@/components/ConfigError';
import { getEnvStatus } from '@/lib/env';
import { getLocaleFromCookie } from '@/lib/i18n';

export default function ConfigGate({ children }: { children: ReactNode }) {
  const envStatus = getEnvStatus();
  if (!envStatus.ok) {
    const locale = getLocaleFromCookie();
    return <ConfigError missing={envStatus.missing} locale={locale} />;
  }
  return <>{children}</>;
}
