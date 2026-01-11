import { redirect } from 'next/navigation';

export default function AcceptInvitePage({ searchParams }: { searchParams: { token?: string } }) {
  const token = searchParams.token;
  if (!token) {
    redirect('/app/household?error=missing-token');
  }
  redirect(`/invite?token=${encodeURIComponent(token)}`);
}
