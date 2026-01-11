import { redirect } from 'next/navigation';
import { createServerClient } from './supabase/server';

export async function requireUser(nextPath?: string) {
  const supabase = createServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    const redirectTo = nextPath ? `/auth?next=${encodeURIComponent(nextPath)}` : '/auth';
    redirect(redirectTo);
  }
  return data.user;
}
