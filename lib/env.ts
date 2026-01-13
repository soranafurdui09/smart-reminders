const requiredKeys = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_APP_URL'
] as const;

export type RequiredEnvKey = (typeof requiredKeys)[number];

const publicRequiredKeys = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_APP_URL'
] as const;

export type RequiredPublicEnvKey = (typeof publicRequiredKeys)[number];

function normalizeEnvValue(value: string | undefined) {
  return typeof value === 'string' ? value.trim() : '';
}

const publicEnv = {
  NEXT_PUBLIC_SUPABASE_URL: normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  NEXT_PUBLIC_APP_URL: normalizeEnvValue(process.env.NEXT_PUBLIC_APP_URL)
} as const;

export function getEnvStatus() {
  const missing = requiredKeys.filter((key) => !normalizeEnvValue(process.env[key]));
  return { ok: missing.length === 0, missing };
}

export function getRequiredEnv(key: RequiredEnvKey) {
  return normalizeEnvValue(process.env[key]);
}

export function getPublicEnvStatus() {
  const missing = publicRequiredKeys.filter((key) => !publicEnv[key]);
  return { ok: missing.length === 0, missing };
}

export function getRequiredPublicEnv(key: RequiredPublicEnvKey) {
  return publicEnv[key];
}

export function getOptionalEnv(key: string) {
  return normalizeEnvValue(process.env[key]);
}

function getRequiredNonTestEnv(key: string) {
  const value = normalizeEnvValue(process.env[key]);
  if (!value && process.env.NODE_ENV !== 'test') {
    throw new Error(`Missing env var: ${key}`);
  }
  return value;
}

export function getGoogleClientId() {
  return getRequiredNonTestEnv('GOOGLE_CLIENT_ID');
}

export function getGoogleClientSecret() {
  return getRequiredNonTestEnv('GOOGLE_CLIENT_SECRET');
}

export function getGoogleCalendarRedirectUrl() {
  return getRequiredNonTestEnv('GOOGLE_CALENDAR_REDIRECT_URL');
}

export function getSupabaseServerUrl() {
  return normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL) || normalizeEnvValue(process.env.SUPABASE_URL);
}

export function getSupabaseStorageKey() {
  const url = normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!url) {
    return '';
  }
  try {
    const hostname = new URL(url).hostname;
    const normalizedHost = ['127.0.0.1', 'localhost', '0.0.0.0', '::1', 'host.docker.internal'].includes(hostname)
      ? 'localhost'
      : hostname;
    const projectRef = normalizedHost.split('.')[0];
    return `sb-${projectRef}-auth-token`;
  } catch {
    return '';
  }
}
