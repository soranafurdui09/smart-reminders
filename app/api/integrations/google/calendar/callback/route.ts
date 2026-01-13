import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/route';
import { decodeState, exchangeCodeForTokens } from '@/lib/google/calendar';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  if (!code) {
    return NextResponse.redirect(new URL('/app/settings?google=error', request.url));
  }

  const supabase = createRouteClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  const stateUserId = decodeState(state);
  if (stateUserId && stateUserId !== user.id) {
    return NextResponse.redirect(new URL('/app/settings?google=error', request.url));
  }

  try {
    await exchangeCodeForTokens(user.id, code);
    return NextResponse.redirect(new URL('/app/settings?google=connected', request.url));
  } catch (error) {
    console.error('[google] callback failed', error);
    return NextResponse.redirect(new URL('/app/settings?google=error', request.url));
  }
}
