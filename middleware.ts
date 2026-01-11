// middleware.ts
import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Lăsăm orice nu începe cu /app să treacă liber
  if (!pathname.startsWith('/app')) {
    return NextResponse.next();
  }

  // Verificăm doar dacă există un cookie Supabase de tip auth
  const hasSupabaseAuthCookie = request.cookies
    .getAll()
    .some((cookie) =>
      cookie.name.startsWith('sb-') && cookie.name.endsWith('auth-token.0')
    );

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
