import { mockCookieName, parseMockSession } from '@rotra/data/auth/cookie'
import { dataMode } from '@rotra/db/auth/data-mode'
import { refreshProxySession } from '@rotra/db/auth/proxy-session'
import { type NextRequest, NextResponse } from 'next/server'

const PUBLIC_PAGE_PREVIEW = /^\/sessions\/[^/]+\/public-page\/?$/

/**
 * Navigation guard only. Mock mode checks the mock marker; real mode verifies and refreshes the
 * Supabase session and ignores mock cookies. Route Handlers authorize again at the service boundary.
 */
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  // Route Handlers authorize themselves at the service boundary and answer in JSON, never a redirect.
  // The operator preview decides itself (#469): anyone but the owning club goes to /s/<slug>.
  const protectedPath =
    path !== '/login' &&
    path !== '/s' &&
    !path.startsWith('/s/') &&
    !path.startsWith('/api/') &&
    !PUBLIC_PAGE_PREVIEW.test(path)
  if (dataMode() === 'real') {
    const session = await refreshProxySession('club', request, () => NextResponse.next({ request }))
    if (protectedPath && !session.signedIn) {
      const redirect = NextResponse.redirect(new URL('/login', request.url))
      session.carryTo(redirect)
      return redirect
    }
    return session.response
  }
  if (
    protectedPath &&
    !parseMockSession(request.cookies.get(mockCookieName('club'))?.value, 'club')
  ) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return NextResponse.next()
}
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
}
