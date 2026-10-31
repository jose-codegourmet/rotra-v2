import 'server-only'
import { MOCK_COOKIE_PREFIX } from './data-mode'
import { type CookieToSet, verifySubject } from './supabase'

type ProxyRequest = {
  cookies: {
    getAll(): { name: string; value: string }[]
    set(name: string, value: string): unknown
  }
}

type ProxyResponse = {
  cookies: {
    set(name: string, value: string, options?: object): unknown
    delete(name: string): unknown
  }
  headers: Headers
}

/**
 * Real-mode session check for `proxy.ts`. Refreshes the Supabase session cookies (on the request,
 * so the route sees them, and on the response), deletes mock session cookies, and reports whether a
 * verified session exists. `next` builds the pass-through response (`() => NextResponse.next({ request })`).
 *
 * Navigation only: every Route Handler still authorizes through `@rotra/db/service/handler`, because
 * the proxy alone is not a security boundary. No database access, so the proxy never loads Prisma.
 */
export async function refreshProxySession<R extends ProxyResponse>(
  request: ProxyRequest,
  next: () => R,
) {
  let response = next()
  let refreshed: CookieToSet[] = []
  let refreshHeaders: Record<string, string> = {}
  const mockNames = request.cookies
    .getAll()
    .map((cookie) => cookie.name)
    .filter((name) => name.startsWith(MOCK_COOKIE_PREFIX))

  const verified = await verifySubject({
    getAll: () =>
      request.cookies.getAll().filter((cookie) => !cookie.name.startsWith(MOCK_COOKIE_PREFIX)),
    setAll: (values, headers) => {
      for (const { name, value } of values) request.cookies.set(name, value)
      response = next()
      refreshed = values
      refreshHeaders = headers
    },
  })

  /** Applies the refreshed cookies, no-store headers and mock-cookie deletion to a response. */
  const carryTo = (target: ProxyResponse) => {
    for (const { name, value, options } of refreshed) target.cookies.set(name, value, options)
    for (const [key, value] of Object.entries(refreshHeaders)) target.headers.set(key, value)
    for (const name of mockNames) target.cookies.delete(name)
  }
  carryTo(response)

  return { signedIn: verified !== null, response, carryTo }
}
