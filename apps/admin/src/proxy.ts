import { dataMode } from '@rotra/api-proxy/data-mode'
import { forwardToGo, goApiEnabled } from '@rotra/api-proxy/go-forward'
import { accessCookieName, verifyAccessPass } from '@rotra/api-proxy/pass'
import { ADMIN_COOKIE_NAME, parseAdminSession } from '@rotra/data/admin-account/cookie'
import { refreshProxySession } from '@rotra/db/auth/proxy-session'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * Navigation guard only. Mock mode checks the mock marker; real mode verifies and refreshes the
 * Supabase session and ignores mock cookies. Route Handlers authorize again at the service boundary,
 * which also checks the session belongs to an active admin account.
 */
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  // Beta (B-32): moved paths reach Go first; with Go in front nobody is signed in and Supabase is never called.
  const moved = await forwardToGo(request, 'admin')
  if (moved) return moved
  const goMode = goApiEnabled()
  // Route Handlers authorize themselves at the service boundary and answer in JSON, never a redirect.
  const route = (signedIn: boolean) =>
    path.startsWith('/api/')
      ? null
      : path === '/login'
        ? signedIn
          ? '/clubs'
          : null
        : signedIn
          ? null
          : '/login'

  if (goMode) {
    // A pass signed by Go for this app lets a page load, even an expired one (the client refreshes on
    // 'expired'). On /login only a still-valid pass skips the form, so a dead session cannot loop.
    const pass = path.startsWith('/api/')
      ? null
      : await verifyAccessPass(request.cookies.get(accessCookieName('admin'))?.value, 'admin')
    const destination = route(
      path === '/login' ? Boolean(pass?.ok && !pass.expired) : Boolean(pass?.ok),
    )
    const response = destination
      ? NextResponse.redirect(new URL(destination, request.url))
      : NextResponse.next()
    response.headers.set('Cache-Control', 'private, no-store')
    return response
  }

  if (dataMode() === 'real') {
    const session = await refreshProxySession('admin', request, () =>
      NextResponse.next({ request }),
    )
    const destination = route(session.signedIn)
    const response = destination
      ? NextResponse.redirect(new URL(destination, request.url))
      : session.response
    if (destination) session.carryTo(response)
    response.headers.set('Cache-Control', 'private, no-store')
    return response
  }

  const session = parseAdminSession(request.cookies.get(ADMIN_COOKIE_NAME)?.value)
  const destination = route(session.kind === 'owner')
  const response = destination
    ? NextResponse.redirect(new URL(destination, request.url))
    : NextResponse.next()
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|art/|icons/|favicon.ico|icon.png|apple-icon.png|manifest.webmanifest|robots.txt|sitemap.xml).*)',
  ],
}
