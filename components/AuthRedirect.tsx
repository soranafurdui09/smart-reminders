'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';

export default function AuthRedirect({ next }: { next: string }) {
  const router = useRouter();

  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      const supabase = createBrowserClient();
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
