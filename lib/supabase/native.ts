import { createClient } from '@supabase/supabase-js';
import { Preferences } from '@capacitor/preferences';
import type { Database } from './types';
import { getPublicEnvStatus, getRequiredPublicEnv } from '@/lib/env';

type StorageAdapter = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

export const NATIVE_AUTH_STORAGE_KEY = 'sb-auth-token';

const PreferencesStorageAdapter: StorageAdapter = {
  async getItem(key) {
    const { value } = await Preferences.get({ key });
    return value ?? null;
  },
  async setItem(key, value) {
    await Preferences.set({ key, value });
  },
  async removeItem(key) {
    await Preferences.remove({ key });
  }
};

let nativeClient: ReturnType<typeof createClient<Database>> | null = null;

export function getNativeSupabase() {
  if (nativeClient) return nativeClient;

  const envStatus = getPublicEnvStatus();
  if (!envStatus.ok) {
    throw new Error(`Missing env vars: ${envStatus.missing.join(', ')}`);
  }

  nativeClient = createClient<Database>(
    getRequiredPublicEnv('NEXT_PUBLIC_SUPABASE_URL'),
    getRequiredPublicEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      auth: {
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storage: PreferencesStorageAdapter,
        storageKey: NATIVE_AUTH_STORAGE_KEY
      }
    }
  );

  return nativeClient;
}
