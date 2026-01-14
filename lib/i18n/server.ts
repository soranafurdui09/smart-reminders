import { cookies } from 'next/headers';
import { Locale, normalizeLocale, defaultLocale } from './i18n';

export function getLocaleFromCookie(): Locale {
  const value = cookies().get('locale')?.value;
  return normalizeLocale(value);
}

export function getLocaleFromRequest(): Locale {
  try {
    return getLocaleFromCookie();
  } catch {
    return defaultLocale;
  }
}
