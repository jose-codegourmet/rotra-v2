/** A club identifies the invitation's origin for RTR ID allocation, never a guest to link. */
export function guestRegistrationUrl(clubId: string) {
  const origin =
    typeof location !== 'undefined' && location.hostname === 'localhost'
      ? 'http://localhost:9001'
      : 'https://player.rotra.club'
  return `${origin}/register/${encodeURIComponent(clubId)}`
}
