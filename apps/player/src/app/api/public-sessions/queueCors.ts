import { PLAYER_ORIGINS, QUEUE_ORIGINS } from '@rotra/data/public-session/context'

/**
 * The Queue session page's credentialed calls to the Player app (#569, #687). Only the paired Queue
 * origin may call, and only on its own Player origin; the Player cookie never travels to Queue.
 * Returns the response headers, or null when the caller is not allowed.
 */
export function queueCorsHeaders(request: Request) {
  const origin = request.headers.get('Origin')
  const pair = origin ? QUEUE_ORIGINS.indexOf(origin) : -1
  const headers = new Headers({ 'Cache-Control': 'private, no-store', Vary: 'Origin, Cookie' })
  if (pair < 0 || new URL(request.url).origin !== PLAYER_ORIGINS[pair])
    return { headers, ok: false }
  headers.set('Access-Control-Allow-Origin', origin as string)
  headers.set('Access-Control-Allow-Credentials', 'true')
  return { headers, ok: true }
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
