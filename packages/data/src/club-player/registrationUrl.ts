/** A club identifies the invitation's origin for RTR ID allocation, never a guest to link. */
export function guestRegistrationUrl(clubId: string) {
  return `${registrationOrigin()}/register/${encodeURIComponent(clubId)}`
}

/**
 * The club invite link a Queue Master shares: `/register/<clubId>?k=<code>`. Real mode stores no
 * invite code yet (#707), so with no code it is the plain club link, never an empty `?k=`.
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
