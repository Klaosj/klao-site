import { NextRequest, NextResponse } from 'next/server';

const LOCALES = ['en', 'th'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const first = pathname.split('/')[1];
  if (LOCALES.includes(first)) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = `/en${pathname === '/' ? '' : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!api/|_next/|images/|favicon\\.ico$|.*\\..*).*)'],
};
