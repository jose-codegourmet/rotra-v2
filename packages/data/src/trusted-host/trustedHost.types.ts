/**
 * A row of a club's trusted-host list (D-2026-11-22-01): one of its saved players (guests and
 * unclaimed players too) that the club trusts to host its Queue Sessions. Informational only: it
 * grants no role, permission or sign-in. Removing a trusted host sets `removedAt`; the row stays as
 * history and the saved player is untouched. One current row (no `removedAt`) per saved player.
 */
export type ClubTrustedHost = {
  id: string
  clubId: string
  clubPlayerId: string
  addedAt: number
  /** The club took them off the list; null = currently trusted */
  removedAt: number | null
}

/**
 * One current trusted host as Club settings › Trusted hosts reads them. The screen joins it to the
 * saved player (`useClubPlayers`) for the name, picture and identity.
 */
export type TrustedHost = {
  id: string
  clubPlayerId: string
  addedAt: number
}
