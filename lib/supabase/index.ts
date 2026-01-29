import { getNativeSupabase } from './native';
import { getWebSupabase } from './web';

export function getSupabaseClient() {
  return getWebSupabase();
}

export { getNativeSupabase, NATIVE_AUTH_STORAGE_KEY } from './native';
export { getWebSupabase } from './web';
