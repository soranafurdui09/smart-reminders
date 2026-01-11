'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { normalizeLocale } from '@/lib/i18n';

export async function updateLocale(formData: FormData) {
  const user = await requireUser('/app/settings');
  const locale = normalizeLocale(String(formData.get('locale') || ''));

  const supabase = createServerClient();
  await supabase.from('profiles').update({ locale }).eq('user_id', user.id);

  const cookieStore = cookies();
  cookieStore.set('locale', locale, { path: '/', maxAge: 60 * 60 * 24 * 365 });

  redirect('/app/settings?updated=1');
}
