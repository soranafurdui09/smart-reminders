// middleware.ts
import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Lăsăm orice nu începe cu /app să treacă liber
  if (!pathname.startsWith('/app')) {
    return NextResponse.next();
  }

  // În producție nu folosim middleware-ul pentru auth (se bazează pe SSR în pagini).
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.next();
  }

  // Verificăm doar dacă există un cookie Supabase de tip auth.
  // Acceptă atât cookie chunked (auth-token.0) cât și nechunked (auth-token).
  const hasSupabaseAuthCookie = request.cookies
    .getAll()
    .some((cookie) => {
      if (!cookie.name.startsWith('sb-')) return false;
      return (
        cookie.name.endsWith('auth-token') ||
        cookie.name.endsWith('auth-token.0') ||
        cookie.name.includes('auth-token.')
      );
    });

  if (!hasSupabaseAuthCookie) {
    // Nu pare logat -> redirect la /auth, cu parametru next=...
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/auth';
    redirectUrl.searchParams.set('next', pathname + search);
    return NextResponse.redirect(redirectUrl);
  }

  // Are cookie -> îl lăsăm mai departe
  return NextResponse.next();
}

export const config = {
  matcher: ['/app/:path*'],
};
