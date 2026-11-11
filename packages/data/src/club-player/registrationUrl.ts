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
 * settings › Copy link, Share club invite › Copy invite link, the QR and a guest's invite). The
 * server checks `k` against the club's current code (#712). Every club has a code, so a missing
 * one prints the plain link (refused), never an empty `?k=`.
 */
export function clubInviteUrl(clubId: string, code?: string | null) {
  const base = guestRegistrationUrl(clubId)
  return code ? `${base}?k=${encodeURIComponent(code)}` : base
}

function registrationOrigin() {
  return typeof location !== 'undefined' && location.hostname === 'localhost'
    ? 'http://localhost:9001'
    : 'https://player.rotra.club'
}
