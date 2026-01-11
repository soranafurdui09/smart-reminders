'use server';

import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { getRequestOrigin, getSafeNextPath } from '@/lib/http';

export async function signInWithEmail(formData: FormData) {
  const email = String(formData.get('email') || '').trim();
  const next = getSafeNextPath(String(formData.get('next') || '').trim());
  if (!email) {
    redirect('/auth?error=missing-email');
  }
  const supabase = createServerClient();
  const origin = getRequestOrigin();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ''}`
    }
  });
  if (error) {
    redirect('/auth?error=otp-failed');
  }
  redirect('/auth?check-email=1');
}

export async function signInWithGoogle(formData: FormData) {
  const next = getSafeNextPath(String(formData.get('next') || '').trim());
  const supabase = createServerClient();
  const origin = getRequestOrigin();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ''}`
    }
  });
  if (error || !data.url) {
    const message = error?.message?.toLowerCase() ?? '';
    if (message.includes('provider') || message.includes('oauth')) {
      redirect('/auth?error=oauth-not-configured');
    }
    redirect('/auth?error=oauth-failed');
  }
  redirect(data.url);
}

export async function signOut() {
  const supabase = createServerClient();
  await supabase.auth.signOut();
  redirect('/auth');
}
