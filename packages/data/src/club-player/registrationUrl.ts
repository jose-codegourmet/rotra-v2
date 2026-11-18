import { appOrigin } from '../app-origins'

/**
 * The plain `/register/<clubId>`: the base of the club invite link. On its own it is refused in
 * real mode (#712); print `clubInviteUrl` wherever a link is shared. A club identifies the
 * invitation's origin for RTR ID allocation, never a guest to link.
 */
export function guestRegistrationUrl(clubId: string) {
  return `${registrationOrigin()}/register/${encodeURIComponent(clubId)}`
}

/**
 * The club invite link a Queue Master shares: `/register/<clubId>?k=<code>` (Queue invite card, Club
 * settings › Copy link, Share club invite › Copy invite link and the QR). The server checks `k`
 * against the club's current code (#712). Every club has a code, so a missing one prints the plain
 * link (refused), never an empty `?k=`. A guest's own invite is not this link: it is their claim
 * link (`createPlayerInvite`, D-2026-11-18-07).
 */
export function clubInviteUrl(clubId: string, code?: string | null) {
  const base = guestRegistrationUrl(clubId)
  return code ? `${base}?k=${encodeURIComponent(code)}` : base
}

function registrationOrigin() {
  return appOrigin('player')
}
