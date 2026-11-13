/**
 * The three ROTRA app origins. Production is the canonical same-site deployment; local work runs on
 * localhost 9000/9001/9002. A run that serves the apps elsewhere (the e2e suite on 127.0.0.1
 * 9100-9102) sets NEXT_PUBLIC_ROTRA_QUEUE_URL / _PLAYER_URL / _ADMIN_URL; unset, nothing changes.
 * Each `process.env.NEXT_PUBLIC_*` is written out in full so Next.js inlines it in client code.
 */
// @rotra/data ships without Node types; Next inlines NEXT_PUBLIC_* values at build time.
declare const process: {
  env: {
    NEXT_PUBLIC_ROTRA_QUEUE_URL?: string
    NEXT_PUBLIC_ROTRA_PLAYER_URL?: string
    NEXT_PUBLIC_ROTRA_ADMIN_URL?: string
  }
}

const PRODUCTION = {
  queue: 'https://queue.rotra.club',
  player: 'https://player.rotra.club',
  admin: 'https://admin.rotra.club',
} as const
const LOCAL = {
  queue: 'http://localhost:9000',
  player: 'http://localhost:9001',
  admin: 'http://localhost:9002',
} as const
export type RotraApp = keyof typeof PRODUCTION

/** A configured origin (no path, no trailing slash), or null when unset or not an http(s) URL. */
function configured(value: string | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.origin : null
  } catch {
    return null
  }
}

/** The origin set for `app` through NEXT_PUBLIC_ROTRA_*_URL, or null when unset. */
export function configuredOrigin(app: RotraApp) {
  if (app === 'queue') return configured(process.env.NEXT_PUBLIC_ROTRA_QUEUE_URL)
  if (app === 'player') return configured(process.env.NEXT_PUBLIC_ROTRA_PLAYER_URL)
  return configured(process.env.NEXT_PUBLIC_ROTRA_ADMIN_URL)
}

/**
 * Where to link another app from the browser: the configured origin, else localhost when this page
 * is on localhost, else production.
 */
export function appOrigin(app: RotraApp): string {
  const explicit = configuredOrigin(app)
  if (explicit) return explicit
  return typeof location !== 'undefined' && location.hostname === 'localhost'
    ? LOCAL[app]
    : PRODUCTION[app]
}

/**
 * A player's ROTRA profile in the Player app (`/find/<RTR>`), opened in a new tab from the Queue and
 * Admin profile cards (2026-11-13-profile-card-open-share).
 */
export function rotraProfileUrl(rtrId: string): string {
  return `${appOrigin('player')}/find/${encodeURIComponent(rtrId)}`
}

/**
 * The Queue and Player origins that may talk to each other (the public session page's credentialed
 * calls), as two lists paired by index: production, local, then the configured pair when both are
 * set.
 */
export function pairedQueuePlayerOrigins(): { queue: string[]; player: string[] } {
  const queue: string[] = [PRODUCTION.queue, LOCAL.queue]
  const player: string[] = [PRODUCTION.player, LOCAL.player]
  const q = configuredOrigin('queue')
  const p = configuredOrigin('player')
  if (q && p && !queue.includes(q)) {
    queue.push(q)
    player.push(p)
  }
  return { queue, player }
}
