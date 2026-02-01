 'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const DEV = process.env.NODE_ENV !== 'production';

function nowTs() {
  return new Date().toISOString();
}

export default function DebugNavLogger() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!DEV || typeof window === 'undefined') return;
    const href = window.location.href;
    console.log('[nav-debug] mount', JSON.stringify({ ts: nowTs(), href }));
  }, []);

  useEffect(() => {
    if (!DEV || typeof window === 'undefined') return;
    const href = `${window.location.origin}${pathname}${searchParams?.toString() ? `?${searchParams}` : ''}`;
    console.log('[nav-debug] route', JSON.stringify({ ts: nowTs(), href }));
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!DEV || typeof window === 'undefined') return;

    const originalPushState = window.history.pushState.bind(window.history);
    const originalReplaceState = window.history.replaceState.bind(window.history);
    const originalAssign = window.location.assign?.bind(window.location);
    const originalReplace = window.location.replace?.bind(window.location);

    window.history.pushState = (...args) => {
      const url = args[2];
      console.log('[nav-debug] pushState', JSON.stringify({ ts: nowTs(), url }));
      return originalPushState(...args);
    };

    window.history.replaceState = (...args) => {
      const url = args[2];
      console.log('[nav-debug] replaceState', JSON.stringify({ ts: nowTs(), url }));
      return originalReplaceState(...args);
    };

    try {
      window.location.assign = (url: string | URL) => {
        console.log('[nav-debug] location.assign', JSON.stringify({ ts: nowTs(), url }));
        return originalAssign?.(url);
      };
      window.location.replace = (url: string | URL) => {
        console.log('[nav-debug] location.replace', JSON.stringify({ ts: nowTs(), url }));
        return originalReplace?.(url);
      };
    } catch {
      // ignore if Location is not writable in this environment
    }

    const handlePop = () => {
      console.log('[nav-debug] popstate', JSON.stringify({ ts: nowTs(), href: window.location.href }));
    };
    window.addEventListener('popstate', handlePop);

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      try {
        if (originalAssign) window.location.assign = originalAssign;
        if (originalReplace) window.location.replace = originalReplace;
      } catch {
        // ignore
      }
      window.removeEventListener('popstate', handlePop);
    };
  }, []);

  return null;
}
