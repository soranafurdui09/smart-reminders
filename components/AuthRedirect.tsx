'use client';

// Auth invariant: use the environment-appropriate Supabase client to avoid PKCE state mismatches.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';

export default function AuthRedirect({ next }: { next: string }) {
  const router = useRouter();

  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getUser();
      if (active && data.user) {
        router.replace(next);
      }
    };

    checkSession();
    return () => {
      active = false;
    };
  }, [next, router]);

  return null;
}
