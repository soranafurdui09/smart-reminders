import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const debug = url.searchParams.get('debug') === '1';
  if (!debug) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const hdrs = headers();
  const host = hdrs.get('host') ?? url.host ?? null;
  const userAgent = hdrs.get('user-agent');
  const secret = process.env.DEBUG_AUTH_SECRET;
  const debugHeader = hdrs.get('x-debug-auth');
  const allowLocalhost = Boolean(host && host.startsWith('localhost'));
  const allowSecret = Boolean(secret && debugHeader && debugHeader === secret);

  if (!allowLocalhost && !allowSecret) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const cookieStore = cookies();
  const allNames = cookieStore.getAll().map((cookie) => cookie.name);
  const supabaseCookieNames = allNames.filter(
    (name) => /^(sb-|supabase)/i.test(name) || /auth-token/i.test(name)
  );

  return NextResponse.json({
    ok: true,
    host,
    userAgent,
    allCookieNamesCount: allNames.length,
    supabaseCookieNames,
    allCookieNamesSample: allNames.slice(0, 20)
  });
}
