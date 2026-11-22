/**
 * A Queue Session's host row (#1004, D-2026-11-22-01): one of the club's saved players assigned to
 * host that session. Shown, never a permission. Assigning also registers them as a player (a slot,
 * or the waitlist once every slot is taken) unless they are already on the roster or waitlist; that
 * registration is a separate row, so ending the host row (`removedAt`) never removes it. One current
 * row (no `removedAt`) per saved player and session.
 */
export type SessionHostRecord = {
  id: string
  clubId: string
  sessionId: string
  clubPlayerId: string
  assignedAt: number
  /** The host designation ended; null = current host */
  removedAt: number | null
}

/**
 * One current host of a session, as Q-SETUP reads them. The screen joins it to the saved player
 * (`useClubPlayers`) for the name, picture and identity.
 */
export type SessionHost = {
  id: string
  clubPlayerId: string
  assignedAt: number
}

/** What saving the setup did with its hosts: newly registered with a slot, or on the waitlist. */
export type SessionHostRegistration = {
  /** Hosts given a slot by this save */
  registered: number
  /** Hosts put on the waitlist because every slot was taken (the preparation rule) */
  waitlisted: number
}
