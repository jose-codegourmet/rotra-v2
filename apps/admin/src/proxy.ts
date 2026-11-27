import { ADMIN_COOKIE_NAME, parseAdminSession } from '@rotra/data/admin-account/cookie'
import { dataMode } from '@rotra/db/auth/data-mode'
import { refreshProxySession } from '@rotra/db/auth/proxy-session'
import { forwardToGo, goApiEnabled } from '@rotra/db/proxy/go-forward'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * Navigation guard only. Mock mode checks the mock marker; real mode verifies and refreshes the
 * Supabase session and ignores mock cookies. Route Handlers authorize again at the service boundary,
 * which also checks the session belongs to an active admin account.
 */
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  // Beta (B-32): moved paths reach Go first; with Go in front nobody is signed in and Supabase is never called.
  const moved = await forwardToGo(request)
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
    const destination = route(false)
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
