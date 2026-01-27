import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { getPublicEnvStatus, getRequiredPublicEnv } from '@/lib/env';

let browserClient: SupabaseClient<Database> | null = null;

export function getBrowserClient() {
  if (browserClient) return browserClient;
  const envStatus = getPublicEnvStatus();
  if (!envStatus.ok) {
    throw new Error(`Missing env vars: ${envStatus.missing.join(', ')}`);
  }
  browserClient = createClient<Database>(
    getRequiredPublicEnv('NEXT_PUBLIC_SUPABASE_URL'),
    getRequiredPublicEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined
      }
    }
  );
  return browserClient;
}
