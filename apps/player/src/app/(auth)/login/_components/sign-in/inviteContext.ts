import type { InviteLink } from '@rotra/data/google-sign-in/types'

/**
 * The /login query contract for an invite (P12). An invite page links to
 * `/login?returnTo=<the invite route>`, for example
 * `/login?returnTo=%2Fregister%2Fc1%3Fsession%3Dthu-open%26invite%3Dk7m2p9qw`. The same `returnTo`
 * is where the player lands after signing in, and it is read here to name the club or session in
 * "Sign in to join <club>." / "Sign in to request a spot in <session>." Routes other than
 * `/register/<clubId>` carry no context; `/register` alone (the Admin link) shows none.
 */
export function inviteLinkFromReturnTo(returnTo: string | undefined): InviteLink | null {
  if (!returnTo?.startsWith('/') || returnTo.startsWith('//')) return null
  try {
    const url = new URL(returnTo, 'https://rotra.local')
    const match = /^\/register\/([^/]+)\/?$/.exec(url.pathname)
    if (!match) return null
    const clubId = decodeURIComponent(match[1] ?? '')
    return {
      clubId,
      sessionSlug: url.searchParams.get('session'),
      sessionInviteCode: url.searchParams.get('invite'),
      clubInviteCode: url.searchParams.get('k'),
    }
  } catch {
    return null
  }
}
