import { ADMIN_COOKIE_NAME, parseAdminSession } from '@rotra/data/admin-account/cookie'
import { dataMode } from '@rotra/db/auth/data-mode'
import { refreshProxySession } from '@rotra/db/auth/proxy-session'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * Navigation guard only. Mock mode checks the mock marker; real mode verifies and refreshes the
 * Supabase session and ignores mock cookies. Route Handlers authorize again at the service boundary,
 * which also checks the session belongs to an active admin account.
 */
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  const route = (signedIn: boolean) =>
    path === '/login' ? (signedIn ? '/clubs' : null) : signedIn ? null : '/login'

  if (dataMode() === 'real') {
    const session = await refreshProxySession(request, () => NextResponse.next({ request }))
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
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
}
