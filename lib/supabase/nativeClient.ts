import { Preferences } from '@capacitor/preferences';
import { NATIVE_AUTH_STORAGE_KEY, getNativeSupabase } from './native';

export { NATIVE_AUTH_STORAGE_KEY, getNativeSupabase };

export async function dumpPrefs(label: string) {
  try {
    const { keys } = await Preferences.keys();
    const filtered = keys.filter((key) => /sb-|supabase|pkce|oauth|code-verifier|flow/i.test(key));
    const results = await Promise.all(
      filtered.map(async (key) => {
        const { value } = await Preferences.get({ key });
        return { key, len: value?.length ?? 0 };
      })
    );
    console.log(label, JSON.stringify({ keys: results }));
  } catch (error) {
    console.warn(label, 'preferences dump failed', error);
  }
}
