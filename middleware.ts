import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/lib/supabase/types';
import { getEnvStatus, getRequiredEnv, getSupabaseServerUrl, getSupabaseStorageKey } from '@/lib/env';

export async function middleware(request: NextRequest) {
  const envStatus = getEnvStatus();
  if (!envStatus.ok) {
    return NextResponse.next();
  }

  if (!request.nextUrl.pathname.startsWith('/app')) {
    return NextResponse.next();
  }

  const response = NextResponse.next({ request: { headers: request.headers } });
  const supabase = createServerClient<Database>(
    getSupabaseServerUrl(),
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      auth: {
        storageKey: getSupabaseStorageKey()
      },
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: Parameters<typeof response.cookies.set>[0]) {
          const cookieOptions = typeof options === 'object' && options ? options : {};
          response.cookies.set({ name, value, ...cookieOptions });
        },
        remove(name: string, options: Parameters<typeof response.cookies.set>[0]) {
          const cookieOptions = typeof options === 'object' && options ? options : {};
          response.cookies.set({ name, value: '', ...cookieOptions, maxAge: 0 });
        }
      }
    }
  );

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user && request.nextUrl.pathname.startsWith('/app')) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/auth';
    redirectUrl.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search);
    const redirect = NextResponse.redirect(redirectUrl);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  return response;
}
export const config = {
  matcher: ["/app/:path*"],
};
