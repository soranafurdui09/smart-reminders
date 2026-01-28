import { createWebSupabase, getWebSupabase } from './web';

export function createBrowserClient() {
  return createWebSupabase();
}

export function getBrowserClient() {
  return getWebSupabase();
}
