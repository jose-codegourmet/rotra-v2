/** A club identifies the invitation's origin for RTR ID allocation, never a guest to link. */
export function guestRegistrationUrl(clubId: string) {
  return `${registrationOrigin()}/register/${encodeURIComponent(clubId)}`
}

/** The club invite link a Queue Master shares: `/register/<clubId>?k=<code>`. */
export function clubInviteUrl(clubId: string, code: string) {
  return `${registrationOrigin()}/register/${encodeURIComponent(clubId)}?k=${encodeURIComponent(code)}`
}

function registrationOrigin() {
  return typeof location !== 'undefined' && location.hostname === 'localhost'
    ? 'http://localhost:9001'
    : 'https://player.rotra.club'
}
