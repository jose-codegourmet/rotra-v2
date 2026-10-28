import { mockCookieName, parseMockSession } from '@rotra/data/auth/cookie'
import { type NextRequest, NextResponse } from 'next/server'
/** Mock marker only; replace with real session validation in the auth epic. */
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  const protectedPath = ['/me', '/profile'].some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  )
  if (
    protectedPath &&
    !parseMockSession(request.cookies.get(mockCookieName('player'))?.value, 'player')
  ) {
    const login = new URL('/login', request.url)
    login.searchParams.set('returnTo', `${path}${request.nextUrl.search}`)
    return NextResponse.redirect(login)
  }
  return NextResponse.next()
}
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
}
