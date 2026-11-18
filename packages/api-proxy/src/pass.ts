import { type GoApp, PROXY_SECRET_HEADER } from './go-forward'

/**
 * Verifies the Go access pass (compact JWS, EdDSA/Ed25519) with WebCrypto only, for the three apps'
 * `proxy.ts` navigation guard (go-sign-in 4.1). It never calls Go for a session check: the key set
 * comes from `GET {ROTRA_GO_API_URL}/api/auth/keys` (proxy secret header) and is cached.
 *
 * Outcomes the guard needs:
 * - `{ ok: true, expired: false }`: signed by Go, for this app, inside its window.
 * - `{ ok: true, expired: true }`: signed by Go, for this app, past `exp`. The page may load; the
 *   client's first API call gets 401 `expired`, refreshes and retries.
 * - `{ ok: false }`: no usable pass (`invalid`), or the key set could not be fetched (`unavailable`,
 *   fails closed for this request only; the next request retries).
 *
 * Needs the Node.js runtime (the default for `proxy.ts` in Next 16, Node 24 has Ed25519 in WebCrypto).
 */

export type PassClaims = {
  sub: string
  sid: string
  aud: GoApp
  acc?: string
  club_id?: string
  iat: number
  nbf: number
  exp: number
}

export type PassResult =
  | { ok: true; claims: PassClaims; expired: boolean }
  | { ok: false; reason: 'invalid' | 'unavailable' }

type VerifyKey = Awaited<ReturnType<typeof crypto.subtle.importKey>>

export type PassKey = { kty: string; crv: string; x: string; kid: string }

export const accessCookieName = (app: GoApp) => `rotra-${app}-access`

const KEYS_TTL_MS = 10 * 60_000
const UNKNOWN_KID_REFETCH_MS = 60_000
const EMPTY_RETRY_MS = 5_000
const KEYS_TIMEOUT_MS = 5_000

const cache: {
  keys: Map<string, VerifyKey>
  fetchedAt: number
  attemptedAt: number
  inflight: Promise<boolean> | null
} = { keys: new Map(), fetchedAt: 0, attemptedAt: 0, inflight: null }

function b64urlBytes(text: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null
  try {
    const raw = atob(text.replace(/-/g, '+').replace(/_/g, '/'))
    const bytes = new Uint8Array(raw.length)
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
    return bytes
  } catch {
    return null
  }
}

function jsonPart(text: string): Record<string, unknown> | null {
  const bytes = b64urlBytes(text)
  if (!bytes) return null
  try {
    const value: unknown = JSON.parse(new TextDecoder().decode(bytes))
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

async function importKeys(keys: readonly PassKey[]): Promise<Map<string, VerifyKey>> {
  const next = new Map<string, VerifyKey>()
  for (const key of keys) {
    if (key.kty !== 'OKP' || key.crv !== 'Ed25519' || !key.kid || !key.x) continue
    try {
      next.set(
        key.kid,
        await crypto.subtle.importKey(
          'jwk',
          { kty: 'OKP', crv: 'Ed25519', x: key.x },
          { name: 'Ed25519' },
          false,
          ['verify'],
        ),
      )
    } catch {
      // A malformed key is skipped; the others still work.
    }
  }
  return next
}

async function fetchKeys(): Promise<PassKey[] | null> {
  const base = process.env.ROTRA_GO_API_URL?.trim()
  if (!base) return null
  const headers = new Headers()
  const secret = process.env.ROTRA_PROXY_SECRET
  if (secret) headers.set(PROXY_SECRET_HEADER, secret)
  try {
    const response = await fetch(`${base.replace(/\/+$/, '')}/api/auth/keys`, {
      headers,
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(KEYS_TIMEOUT_MS),
    })
    if (response.status !== 200) return null
    const body = (await response.json()) as { keys?: PassKey[] }
    return Array.isArray(body.keys) ? body.keys : null
  } catch {
    return null
  }
}

/** One shared refresh of the key set; a failure keeps what is cached. */
function refreshKeys(now: number): Promise<boolean> {
  if (cache.inflight) return cache.inflight
  cache.attemptedAt = now
  cache.inflight = (async () => {
    try {
      const fetched = await fetchKeys()
      if (!fetched) return false
      const imported = await importKeys(fetched)
      if (imported.size === 0) return false
      cache.keys = imported
      cache.fetchedAt = now
      return true
    } finally {
      cache.inflight = null
    }
  })()
  return cache.inflight
}

async function keyFor(kid: string, now: number): Promise<VerifyKey | null> {
  const stale = now - cache.fetchedAt >= KEYS_TTL_MS
  if (cache.keys.size === 0 || stale) {
    const gap = cache.keys.size === 0 ? EMPTY_RETRY_MS : UNKNOWN_KID_REFETCH_MS
    if (cache.inflight || now - cache.attemptedAt >= gap) await refreshKeys(now)
  }
  const found = cache.keys.get(kid)
  if (found) return found
  // Unknown kid (a rotation): look again, at most once a minute.
  if (cache.keys.size > 0 && now - cache.attemptedAt >= UNKNOWN_KID_REFETCH_MS) {
    await refreshKeys(now)
    return cache.keys.get(kid) ?? null
  }
  return null
}

/**
 * Pure check against a known key set. Pins `alg` to EdDSA, requires `kid`, verifies the signature
 * first, then the audience and the window (`nbf`, `exp`, leeway 0).
 */
export async function verifyPassWithKeys(
  token: string,
  audience: GoApp,
  keyFor: (kid: string) => Promise<VerifyKey | null | 'unavailable'>,
  nowMs: number,
): Promise<PassResult> {
  const invalid = { ok: false, reason: 'invalid' } as const
  const parts = token.split('.')
  if (parts.length !== 3) return invalid
  const [headerPart, payloadPart, signaturePart] = parts as [string, string, string]
  const header = jsonPart(headerPart)
  if (!header || header.alg !== 'EdDSA' || typeof header.kid !== 'string' || !header.kid)
    return invalid
  const signature = b64urlBytes(signaturePart)
  if (!signature || signature.length !== 64) return invalid
  const key = await keyFor(header.kid)
  if (key === 'unavailable') return { ok: false, reason: 'unavailable' }
  if (!key) return invalid
  let verified = false
  try {
    verified = await crypto.subtle.verify(
      { name: 'Ed25519' },
      key,
      signature,
      new TextEncoder().encode(`${headerPart}.${payloadPart}`),
    )
  } catch {
    return invalid
  }
  if (!verified) return invalid
  const claims = jsonPart(payloadPart)
  if (
    !claims ||
    typeof claims.sub !== 'string' ||
    typeof claims.sid !== 'string' ||
    typeof claims.aud !== 'string' ||
    typeof claims.iat !== 'number' ||
    typeof claims.nbf !== 'number' ||
    typeof claims.exp !== 'number'
  )
    return invalid
  if (claims.aud !== audience) return invalid
  const nowSec = Math.floor(nowMs / 1000)
  if (nowSec < claims.nbf) return invalid
  return { ok: true, claims: claims as unknown as PassClaims, expired: nowSec >= claims.exp }
}

/** Verifies the access pass cookie value for `audience` against Go's published keys. */
export async function verifyAccessPass(
  token: string | undefined,
  audience: GoApp,
): Promise<PassResult> {
  if (!token) return { ok: false, reason: 'invalid' }
  const now = Date.now()
  return verifyPassWithKeys(
    token,
    audience,
    async (kid) => (await keyFor(kid, now)) ?? (cache.keys.size === 0 ? 'unavailable' : null),
    now,
  )
}

/** Test hook: drop the cached key set. */
export function resetPassKeyCache() {
  cache.keys = new Map()
  cache.fetchedAt = 0
  cache.attemptedAt = 0
  cache.inflight = null
}

export { importKeys as importPassKeys }
