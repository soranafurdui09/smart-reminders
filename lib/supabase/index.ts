import { Capacitor } from '@capacitor/core';
import { getNativeSupabase } from './native';
import { getWebSupabase } from './web';

export function getSupabaseClient() {
  if (typeof window !== 'undefined' && Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    return getNativeSupabase();
  }
  return getWebSupabase();
}

export { getNativeSupabase, NATIVE_AUTH_STORAGE_KEY } from './native';
export { getWebSupabase } from './web';
