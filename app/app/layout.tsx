import AppShell from '@/components/AppShell';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';          // 👈 important
export const fetchCache = 'force-no-store';      // opțional, dar ajută la auth

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser('/app');
  return <AppShell>{children}</AppShell>;
}
