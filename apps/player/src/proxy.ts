import { mockCookieName, parseMockSession } from '@rotra/data/auth/cookie'
import { type NextRequest, NextResponse } from 'next/server'
/** Mock marker only; replace with real session validation in the auth epic. */
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  const protectedPath = path === '/me' || path.startsWith('/me/')
  if (
    protectedPath &&
    !parseMockSession(request.cookies.get(mockCookieName('player'))?.value, 'player')
  ) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return NextResponse.next()
}
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
}
