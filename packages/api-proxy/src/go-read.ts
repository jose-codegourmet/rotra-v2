import 'server-only'
import { APP_HEADER, GO_FORWARD_TIMEOUT_MS, type GoApp, PROXY_SECRET_HEADER } from './go-forward'

/**
 * Server-side read of a Go GET endpoint for pages that read a service directly instead of going
 * through `proxy.ts` (B-51, B-52). Only call it when `goApiEnabled()` is true.
 *
 * Returns the parsed JSON on 200 and `null` on 404. Any other status, a timeout or a network error
 * throws: the caller decides the fallback. No retry, and no cookies or client headers are forwarded,
 * so Go only ever answers the signed-out view. `app` sets `X-Rotra-App` for routes that need it (the
 * claim link: `player`).
 */
export async function readFromGo<T>(
  path: string,
  options: { app?: GoApp } = {},
): Promise<T | null> {
  const base = process.env.ROTRA_GO_API_URL?.trim()
  if (!base) throw new Error('ROTRA_GO_API_URL is not set')

  const headers = new Headers()
  const secret = process.env.ROTRA_PROXY_SECRET
  if (secret) headers.set(PROXY_SECRET_HEADER, secret)
  if (options.app) headers.set(APP_HEADER, options.app)

  const response = await fetch(`${base.replace(/\/+$/, '')}${path}`, {
    method: 'GET',
    headers,
    redirect: 'manual',
    signal: AbortSignal.timeout(GO_FORWARD_TIMEOUT_MS),
  })
  if (response.status === 404) return null
  if (response.status !== 200) throw new Error(`Go API answered ${response.status}`)
  return (await response.json()) as T
}
