// Stands in for `next/headers` in the capture run: `cookies()` only works inside a Next.js request. The claim handlers hand the store to the
// Supabase adapter, which the refused-before-provider cases never reach. The visitor routes (join-request, my-request) read and set a cookie, so
// the store is real enough for them: it reads the `cookie` header the step sends (resetJar) and serializes what a handler sets with Next's own
// ResponseCookies, so the Set-Cookie text is exactly what Next writes. The capture base reads it back (jar.response) into the answer's headers.
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const require = createRequire(resolve(here, '../../../queue/package.json'))
const { RequestCookies, ResponseCookies } = require('next/dist/compiled/@edge-runtime/cookies')

export const jar = { request: new Headers(), response: new Headers() }

/** Starts a request: the cookie header the browser sends (or none) and an empty response. */
export function resetJar(cookieHeader) {
  jar.request = new Headers(cookieHeader ? { cookie: cookieHeader } : {})
  jar.response = new Headers()
}

export async function cookies() {
  const request = new RequestCookies(jar.request)
  const response = new ResponseCookies(jar.response)
  return {
    getAll: () => request.getAll(),
    get: (name) => request.get(name),
    set: (...args) => response.set(...args),
  }
}
