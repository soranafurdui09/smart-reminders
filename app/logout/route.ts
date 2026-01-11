import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/route';

export async function GET(request: Request) {
  const supabase = createRouteClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/auth', request.url));
}
