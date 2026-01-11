// middleware.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/lib/supabase/types';

export async function middleware(request: NextRequest) {
  // Lasă tot ce nu e /app în pace
  if (!request.nextUrl.pathname.startsWith('/app')) {
    return NextResponse.next();
  }

  const response = NextResponse.next({
    request: {
      headers: request.headers
    }
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: Parameters<typeof response.cookies.set>[0]) {
          const cookieOptions = (typeof options === 'object' && options) ? options : {};
          response.cookies.set({ name, value, ...cookieOptions });
        },
        remove(name: string, options: Parameters<typeof response.cookies.set>[0]) {
          const cookieOptions = (typeof options === 'object' && options) ? options : {};
          response.cookies.set({ name, value: '', ...cookieOptions, maxAge: 0 });
        }
      }
    }
  );

  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error) {
    console.error('[middleware] getUser error', error);
  }

  if (!user) {
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
  matcher: ['/app/:path*']
};
