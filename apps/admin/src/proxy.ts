import { ADMIN_COOKIE_NAME, parseAdminSession } from '@rotra/data/admin-account/cookie'
import { type NextRequest, NextResponse } from 'next/server'

/** Mock marker only. Real provider and session policy belong to the later auth epic. */
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  const session = parseAdminSession(request.cookies.get(ADMIN_COOKIE_NAME)?.value)
  const destination = path === '/login'
    ? session.kind === 'owner' ? '/clubs' : null
    : session.kind === 'owner' ? null : '/login'
  const response = destination
    ? NextResponse.redirect(new URL(destination, request.url))
    : NextResponse.next()
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
}
