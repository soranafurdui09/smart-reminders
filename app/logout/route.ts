import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/route';

export async function POST(request: Request) {
  const supabase = createRouteClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/auth', request.url));
}

export async function GET(request: Request) {
  // Avoid logout on prefetch/GET; require explicit POST.
  return NextResponse.redirect(new URL('/app', request.url));
}
