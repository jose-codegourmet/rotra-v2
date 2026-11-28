import { configuredOrigin } from '@rotra/data/app-origins'
import { PLAYER_ORIGINS, QUEUE_ORIGINS } from '@rotra/data/public-session/context'

/**
 * The session page's credentialed calls to the Player app (#569, #687). The page lives on the
 * Player app (D-2026-11-28-01), so its own calls are same-origin. The Queue operator preview still
 * calls across, so the paired Queue origin may call too, and only on its own Player origin; the
 * Player cookie never travels to Queue. Every other caller is refused.
 */
export function queueCorsHeaders(request: Request) {
  const origin = request.headers.get('Origin')
  const headers = new Headers({ 'Cache-Control': 'private, no-store', Vary: 'Origin, Cookie' })
  // This app's own origin: the configured one when set (a dev server reports request.url as
  // localhost even when it serves 127.0.0.1), else the request's.
  const self = configuredOrigin('player') ?? new URL(request.url).origin
  if (sameOrigin(request, origin, self)) return { headers, ok: true }
  const pair = origin ? QUEUE_ORIGINS.indexOf(origin) : -1
  if (pair < 0 || self !== PLAYER_ORIGINS[pair]) return { headers, ok: false }
  headers.set('Access-Control-Allow-Origin', origin as string)
  headers.set('Access-Control-Allow-Credentials', 'true')
  return { headers, ok: true }
}

/**
 * A call from this app's own pages. A POST always carries `Origin`, so it must match. A
 * same-origin GET may send no `Origin`; it passes unless the browser marks it cross-site, and a
 * cross-site page could not read the answer anyway (no CORS headers are set for it).
 */
function sameOrigin(request: Request, origin: string | null, self: string) {
  if (origin) return origin === self
  if (request.method !== 'GET' && request.method !== 'HEAD') return false
  const site = request.headers.get('Sec-Fetch-Site')
  return site === null || site === 'same-origin'
}

export const forbidden = (headers: Headers) =>
  Response.json({ error: { code: 'forbidden' } }, { status: 403, headers })

/** The preflight for the JSON POSTs: the paired Queue origin only. */
export function preflight(request: Request) {
  const { headers, ok } = queueCorsHeaders(request)
  if (!ok) return forbidden(headers)
  headers.set('Access-Control-Allow-Methods', 'POST')
  headers.set('Access-Control-Allow-Headers', 'Content-Type')
  headers.set('Access-Control-Max-Age', '600')
  return new Response(null, { status: 204, headers })
}

/** Copies the CORS headers onto a handler's response. */
export function withCors(response: Response, headers: Headers) {
  for (const [key, value] of headers) response.headers.set(key, value)
  return response
}
