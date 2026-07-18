import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default function middleware(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/profile/:path*',
    '/records/:path*',
    '/triage/:path*',
    '/hospitals/:path*',
    '/doctors/:path*',
    '/doctor/:path*',
    '/appointments/:path*',
    '/pharmacy/:path*',
  ],
};
