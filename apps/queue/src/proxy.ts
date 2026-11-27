import { dataMode } from '@rotra/api-proxy/data-mode'
import { forwardToGo, goApiEnabled } from '@rotra/api-proxy/go-forward'
import { accessCookieName, verifyAccessPass } from '@rotra/api-proxy/pass'
import { mockCookieName, parseMockSession } from '@rotra/data/auth/cookie'
import { refreshProxySession } from '@rotra/db/auth/proxy-session'
import { type NextRequest, NextResponse } from 'next/server'

const PUBLIC_PAGE_PREVIEW = /^\/sessions\/[^/]+\/public-page\/?$/

/**
 * Navigation guard only. Mock mode checks the mock marker; real mode verifies and refreshes the
 * Supabase session and ignores mock cookies. Route Handlers authorize again at the service boundary.
 */
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  // Beta (B-32): moved paths reach Go first; with Go in front nobody is signed in and Supabase is never called.
  const moved = await forwardToGo(request, 'club')
  if (moved) return moved
  const goMode = goApiEnabled()
  // Route Handlers authorize themselves at the service boundary and answer in JSON, never a redirect.
  // The operator preview decides itself (#469): anyone but the owning club goes to /s/<slug>.
  const protectedPath =
    path !== '/login' &&
    path !== '/s' &&
    !path.startsWith('/s/') &&
    !path.startsWith('/api/') &&
    !PUBLIC_PAGE_PREVIEW.test(path)
  if (goMode) {
    // A pass signed by Go for this app lets the page load, even an expired one: the client's first API
    // call gets 'expired', refreshes and retries. No pass, a bad signature or another app's pass: /login.
    if (protectedPath) {
      const pass = await verifyAccessPass(
        request.cookies.get(accessCookieName('club'))?.value,
        'club',
      )
      if (!pass.ok) return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next()
  }
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
  matcher: [
    '/((?!_next/static|_next/image|art/|icons/|favicon.ico|icon.png|apple-icon.png|manifest.webmanifest|robots.txt|sitemap.xml).*)',
  ],
}
