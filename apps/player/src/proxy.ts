import { mockCookieName, parseMockSession } from '@rotra/data/auth/cookie'
import { GOOGLE_SIGN_IN_DEADLINE } from '@rotra/data/google-sign-in/config'
import { isGoogleDeadlinePassed } from '@rotra/data/google-sign-in/rules'
import { dataMode } from '@rotra/db/auth/data-mode'
import { GOOGLE_GATE_COOKIE, GOOGLE_GATE_OPEN_PATHS } from '@rotra/db/auth/google-cookies'
import { refreshProxySession } from '@rotra/db/auth/proxy-session'
import { forwardToGo, goApiEnabled } from '@rotra/db/proxy/go-forward'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * Navigation guard only. Mock mode checks the mock marker; real mode verifies and refreshes the
 * Supabase session and ignores mock cookies. Route Handlers authorize again at the service boundary.
 */
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  // Beta (B-32): moved paths reach Go first; with Go in front nobody is signed in and Supabase is never called.
  const moved = await forwardToGo(request)
  if (moved) return moved
  const goMode = goApiEnabled()
  const protectedPath =
    /^\/players\/[^/]+\/compare\/?$/.test(path) ||
    ['/home', '/me', '/profile', '/notifications', '/settings'].some(
      (prefix) => path === prefix || path.startsWith(`${prefix}/`),
    )
  const toLogin = () => {
    const login = new URL('/login', request.url)
    login.searchParams.set('returnTo', `${path}${request.nextUrl.search}`)
    return NextResponse.redirect(login)
  }
  if (goMode) return protectedPath ? toLogin() : NextResponse.next()
  if (dataMode() === 'real') {
    const session = await refreshProxySession('player', request, () =>
      NextResponse.next({ request }),
    )
    if (protectedPath && !session.signedIn) {
      const redirect = toLogin()
      session.carryTo(redirect)
      return redirect
    }
    // The Google deadline gate (D-2026-11-16-01): after the deadline a signed-in player with no
    // Google account (the hint the session read keeps, only while the flag is on) stops at
    // /connect-google. Navigation only; Route Handlers refuse on the real state.
    if (
      session.signedIn &&
      request.cookies.get(GOOGLE_GATE_COOKIE)?.value === '1' &&
      isGoogleDeadlinePassed(GOOGLE_SIGN_IN_DEADLINE.date) &&
      !GOOGLE_GATE_OPEN_PATHS.includes(path) &&
      !path.startsWith('/api/') &&
      !path.startsWith('/_next/') &&
      !/\.[a-z0-9]+$/i.test(path)
    ) {
      const connect = new URL('/connect-google', request.url)
      if (path === '/profile/verification') connect.searchParams.set('returnTo', path)
      const redirect = NextResponse.redirect(connect)
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
  matcher: [
    '/((?!_next/static|_next/image|art/|icons/|favicon.ico|icon.png|apple-icon.png|manifest.webmanifest|robots.txt|sitemap.xml).*)',
  ],
}
