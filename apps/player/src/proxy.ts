import { dataMode } from '@rotra/api-proxy/data-mode'
import { forwardToGo, goApiEnabled } from '@rotra/api-proxy/go-forward'
import { accessCookieName, verifyAccessPass } from '@rotra/api-proxy/pass'
import { mockCookieName, parseMockSession } from '@rotra/data/auth/cookie'
import { GOOGLE_SIGN_IN_DEADLINE } from '@rotra/data/google-sign-in/config'
import { isGoogleDeadlinePassed } from '@rotra/data/google-sign-in/rules'
import { GOOGLE_GATE_COOKIE, GOOGLE_GATE_OPEN_PATHS } from '@rotra/db/auth/google-cookies'
import { refreshProxySession } from '@rotra/db/auth/proxy-session'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * The Google deadline gate (D-2026-11-16-01): after the deadline a signed-in player with no Google account (the hint cookie the
 * session read and the password sign-in keep, only while the flag is on) stops at /connect-google. Navigation only; Route
 * Handlers refuse on the real state. Null when the gate does not apply to this request.
 */
function connectGoogleRedirect(request: NextRequest, path: string) {
  if (
    request.cookies.get(GOOGLE_GATE_COOKIE)?.value !== '1' ||
    !isGoogleDeadlinePassed(GOOGLE_SIGN_IN_DEADLINE.date) ||
    GOOGLE_GATE_OPEN_PATHS.includes(path) ||
    path.startsWith('/api/') ||
    // The public session page (D-2026-11-28-01) stays open to everyone, as it was on Queue.
    path.startsWith('/s/') ||
    path.startsWith('/_next/') ||
    /\.[a-z0-9]+$/i.test(path)
  )
    return null
  const connect = new URL('/connect-google', request.url)
  if (path === '/profile/verification') connect.searchParams.set('returnTo', path)
  return NextResponse.redirect(connect)
}

/**
 * Navigation guard only. Mock mode checks the mock marker; real mode verifies and refreshes the
 * Supabase session and ignores mock cookies. Route Handlers authorize again at the service boundary.
 */
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  // Beta (B-32): moved paths reach Go first; with Go in front nobody is signed in and Supabase is never called.
  const moved = await forwardToGo(request, 'player')
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
  if (goMode) {
    // A pass signed by Go for this app lets the page load, even an expired one (the client refreshes on
    // 'expired'). No pass, a bad signature or another app's pass: /login.
    // Go sets the gate hint on the session read and the sign-in; only a request that carries it needs the pass checked
    // on a page that is not protected.
    const hinted = request.cookies.get(GOOGLE_GATE_COOKIE)?.value === '1'
    if (protectedPath || hinted) {
      const pass = await verifyAccessPass(
        request.cookies.get(accessCookieName('player'))?.value,
        'player',
      )
      if (protectedPath && !pass.ok) return toLogin()
      if (pass.ok) {
        const connect = connectGoogleRedirect(request, path)
        if (connect) return connect
      }
    }
    return NextResponse.next()
  }
  if (dataMode() === 'real') {
    const session = await refreshProxySession('player', request, () =>
      NextResponse.next({ request }),
    )
    if (protectedPath && !session.signedIn) {
      const redirect = toLogin()
      session.carryTo(redirect)
      return redirect
    }
    if (session.signedIn) {
      const redirect = connectGoogleRedirect(request, path)
      if (redirect) {
        session.carryTo(redirect)
        return redirect
      }
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
