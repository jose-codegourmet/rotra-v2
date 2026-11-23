// @rotra/data ships without Node types; Next inlines NEXT_PUBLIC_* values at build time.
declare const process: { env: { NEXT_PUBLIC_ROTRA_STREAM_URL?: string } }

/**
 * The Go API's public origin for live streams (B-41: `api.rotra.club`, `api-beta.rotra.club` on beta),
 * from `NEXT_PUBLIC_ROTRA_STREAM_URL`. Null when unset, not an http(s) URL, or not a browser: then no
 * stream is opened and the Refresh bar, pull-down and tab-return refresh are all there is.
 */
export function liveStreamOrigin(): string | null {
  const value = process.env.NEXT_PUBLIC_ROTRA_STREAM_URL
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.origin : null
  } catch {
    return null
  }
}
