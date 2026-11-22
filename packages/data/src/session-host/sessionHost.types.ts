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
  /**
   * The host's name when assigned (#1008): the ROTRA full name for a registered record, else the
   * saved player's name. Refreshed once more when the session ends, then kept.
   */
  nameSnapshot: string
  /**
   * When the session ended (Session done or Mark session invalid) on the rows current then: the
   * finished session's hosts, kept as they were. Null on a row removed before the end, and on every
   * row of an open session.
   */
  frozenAt: number | null
}

/**
 * One host of a session, as Q-SETUP reads them: the current hosts of an open session, or the hosts a
 * finished session ended with (#1008). The screen joins it to the saved player (`useClubPlayers`)
 * for the picture and identity; `name` is the row's snapshot, the name to show on a finished
 * session and whenever that saved player is gone (deleted, or moved into another record).
 */
export type SessionHost = {
  id: string
  clubPlayerId: string
  assignedAt: number
  name: string
}

/** What saving the setup did with its hosts: newly registered with a slot, or on the waitlist. */
export type SessionHostRegistration = {
  /** Hosts given a slot by this save */
  registered: number
  /** Hosts put on the waitlist because every slot was taken (the preparation rule) */
  waitlisted: number
}
