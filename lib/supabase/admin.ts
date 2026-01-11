import { createClient } from '@supabase/supabase-js';
import { getEnvStatus, getRequiredEnv, getSupabaseServerUrl } from '../env';
import type { Database } from './types';

export function createAdminClient() {
  const envStatus = getEnvStatus();
  if (!envStatus.ok) {
    throw new Error(`Missing env vars: ${envStatus.missing.join(', ')}`);
  }
  return createClient<Database>(
    getSupabaseServerUrl(),
    getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false } }
  );
}
