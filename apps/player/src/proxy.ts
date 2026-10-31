import { mockCookieName, parseMockSession } from '@rotra/data/auth/cookie'
import { dataMode } from '@rotra/db/auth/data-mode'
import { refreshProxySession } from '@rotra/db/auth/proxy-session'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * Navigation guard only. Mock mode checks the mock marker; real mode verifies and refreshes the
 * Supabase session and ignores mock cookies. Route Handlers authorize again at the service boundary.
 */
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  const protectedPath = ['/me', '/profile'].some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  )
  const toLogin = () => {
    const login = new URL('/login', request.url)
    login.searchParams.set('returnTo', `${path}${request.nextUrl.search}`)
    return NextResponse.redirect(login)
  }
  if (dataMode() === 'real') {
    const session = await refreshProxySession(request, () => NextResponse.next({ request }))
    if (protectedPath && !session.signedIn) {
      const redirect = toLogin()
      session.carryTo(redirect)
      return redirect
    }
    return session.response
  }
  if (
    protectedPath &&
    !parseMockSession(request.cookies.get(mockCookieName('player'))?.value, 'player')
  ) {
    return toLogin()
  }
  return NextResponse.next()
}
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
}
