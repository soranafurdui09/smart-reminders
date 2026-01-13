import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/route';
import { generateGoogleAuthUrl } from '@/lib/google/calendar';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const supabase = createRouteClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  const url = generateGoogleAuthUrl(user.id);
  return NextResponse.redirect(url);
}
