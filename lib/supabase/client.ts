import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr';
import type { Database } from './types';
import { getPublicEnvStatus, getRequiredPublicEnv } from '@/lib/env';

let browserClient: ReturnType<typeof createSupabaseBrowserClient<Database>> | null = null;

export function createBrowserClient() {
  const envStatus = getPublicEnvStatus();
  if (!envStatus.ok) {
    throw new Error(`Missing env vars: ${envStatus.missing.join(', ')}`);
  }

  return createSupabaseBrowserClient<Database>(
    getRequiredPublicEnv('NEXT_PUBLIC_SUPABASE_URL'),
    getRequiredPublicEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      auth: {
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      }
    }
  );
}

export function getBrowserClient() {
  if (browserClient) return browserClient;
  browserClient = createBrowserClient();
  return browserClient;
}
