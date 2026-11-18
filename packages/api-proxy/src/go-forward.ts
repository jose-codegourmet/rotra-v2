/**
 * Beta stack forwarding (B-30, B-32, B-46). Active only while `ROTRA_GO_API_URL` is set; without it
 * every export here is inert and each app's `proxy.ts` behaves exactly as before.
 *
 * - `ROTRA_GO_API_URL`: base URL of the Go API (no trailing slash needed).
 * - `ROTRA_GO_MOVED_AREAS`: comma-separated `/api/...` path prefixes that Go owns; empty = none.
 *   Matches whole path segments: `/api/sessions` covers `/api/sessions/x`, never `/api/sessions-export`.
 * - `ROTRA_PROXY_SECRET`: sent as `X-Rotra-Proxy-Secret` so Go trusts the forwarded client IP.
 */
export const PROXY_SECRET_HEADER = 'X-Rotra-Proxy-Secret'
/** Which app the call comes from; Go trusts it only because this helper sets it next to the proxy secret. */
export const APP_HEADER = 'X-Rotra-App'
export type GoApp = 'club' | 'player' | 'admin'
export const GO_FORWARD_TIMEOUT_MS = 10_000

/** True when this deployment runs with the Go API in front of its moved areas (beta only). */
export function goApiEnabled(): boolean {
  return Boolean(process.env.ROTRA_GO_API_URL?.trim())
}

function movedAreas(): string[] {
  return (process.env.ROTRA_GO_MOVED_AREAS ?? '')
    .split(',')
    .map((area) => area.trim().replace(/\/+$/, ''))
    .filter((area) => area.startsWith('/'))
}

/** Whole-segment prefix match. */
export function isMovedPath(path: string): boolean {
  return movedAreas().some((area) => path === area || path.startsWith(`${area}/`))
}

// Hop-by-hop headers (RFC 9110) plus the ones fetch must set itself.
const HOP_BY_HOP = [
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
]
// Never trusted from the client; set only by this helper.
const CLIENT_SUPPLIED = [
  'x-forwarded-for',
  'x-real-ip',
  PROXY_SECRET_HEADER.toLowerCase(),
  APP_HEADER.toLowerCase(),
]

type ForwardableRequest = {
  method: string
  headers: Headers
  body: ReadableStream<Uint8Array> | null
  nextUrl: { pathname: string; search: string }
}

function unreachable() {
  return new Response(
    JSON.stringify({
      error: { code: 'unavailable', message: 'The server is unreachable right now. Try again.' },
    }),
    {
      status: 503,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' },
    },
  )
}

/**
 * Returns the Go API's response for a moved `/api/*` path, a 503 JSON error on timeout or network
 * failure, or `null` when the request is not forwarded (call this first in `proxy.ts`). `app` is the
 * calling app; any client-sent `X-Rotra-App` is dropped and this value is set instead.
 */
export async function forwardToGo(
  request: ForwardableRequest,
  app: GoApp,
): Promise<Response | null> {
  const base = process.env.ROTRA_GO_API_URL?.trim()
  const { pathname, search } = request.nextUrl
  if (!base || !pathname.startsWith('/api/') || !isMovedPath(pathname)) return null

  // Vercel sets these from the connection and overwrites any client-sent value.
  const clientIp =
    request.headers.get('x-real-ip')?.trim() ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    ''

  const headers = new Headers(request.headers)
  for (const name of [...HOP_BY_HOP, ...CLIENT_SUPPLIED]) headers.delete(name)
  if (clientIp) {
    headers.set('X-Forwarded-For', clientIp)
    headers.set('X-Real-IP', clientIp)
  }
  const secret = process.env.ROTRA_PROXY_SECRET
  if (secret) headers.set(PROXY_SECRET_HEADER, secret)
  headers.set(APP_HEADER, app)

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD'
  try {
    const upstream = await fetch(`${base.replace(/\/+$/, '')}${pathname}${search}`, {
      method: request.method,
      headers,
      body: hasBody ? request.body : null,
      // Node's fetch needs this to stream a request body.
      ...(hasBody ? { duplex: 'half' } : {}),
      redirect: 'manual',
      signal: AbortSignal.timeout(GO_FORWARD_TIMEOUT_MS),
    } as RequestInit)
    const responseHeaders = new Headers(upstream.headers)
    for (const name of HOP_BY_HOP) responseHeaders.delete(name)
    // fetch already decoded the body; the encoding header would now be wrong.
    responseHeaders.delete('content-encoding')
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    })
  } catch {
    return unreachable()
  }
}
