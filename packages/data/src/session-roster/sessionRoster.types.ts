import type { PlayingLevel } from '../player/player.types'
export type SessionPlayer = {
  id: string
  sessionId: string
  clubPlayerId: string
  nameSnapshot: string
  nicknameSnapshot: string | null
  present: boolean
  presentChangedAt: number | null
  level: PlayingLevel | null
  levelLockedAt: number | null
  confirmedAt: number
  /**
   * Has played a finalized session at this club before this one (Returning vs First time here).
   * Derived from session history; not a stored roster column. Set by the roster fetch.
   */
  hasPlayedAtClubBefore?: boolean
  /**
   * The linked Player's own **I'm here** (D-2026-11-09-03). The QM's last action wins: the
   * “Checked in themselves” mark shows only while the row is present and no presence change came
   * after it (`selfCheckInMark` in public-session rules). Missing on older rows means never.
   */
  selfCheckedInAt?: number | null
  /** The linked Player's own **I'm leaving**; “Left · TIME” while not present and nothing came after it. */
  leftAt?: number | null
}
export type SessionWaitlistEntry = {
  id: string
  sessionId: string
  clubPlayerId: string
  level: PlayingLevel | null
  addedAt: number
}
export type SessionJoinRequest = {
  id: string
  sessionId: string
  name: string
  nickname: string | null
  phoneE164: string | null
  statedBand: 'beginner' | 'intermediate' | 'advanced' | 'unsure'
  /**
   * `closed`: a pending request closed by Cancel session or Session done (not a decline);
   * `decidedAt` is that time. `cancelled`: the signed-in Player's own **Cancel request**.
   */
  status: 'pending' | 'confirmed' | 'declined' | 'closed' | 'cancelled'
  requestedAt: number
  decidedAt: number | null
  clubPlayerId: string | null
  /**
   * The Player account that sent **Request to join as NAME** (D-2026-11-09-02); null or missing for
   * a guest. One pending request per account and session.
   */
  playerId?: string | null
  /** The Session invite code the link carried (`?invite=`), read as “Invited by NAME” (D-2026-11-09-08). */
  inviteCodeId?: string | null
}
/**
 * **I can't make it** (D-2026-11-09-03): a confirmed signed-in Player tells the QM before the start.
 * The slot stays; only the QM's Remove from roster or Keep closes it with a decision. Finishing or
 * cancelling the session closes it with no decision. One open notice per player.
 */
export type DropOutNotice = {
  id: string
  sessionId: string
  /** The roster row (`SessionPlayer.id`) */
  pid: string
  /** The signed-in Player who sent it */
  playerId: string
  at: number
  status: 'open' | 'closed'
  decision: 'kept' | 'removed' | null
  closedAt: number | null
}
/**
 * Session invite (D-2026-11-09-08): one random 8-character code per Player and session, made the
 * first time a confirmed or waitlisted Player opens the invite card, while the session is Prepared.
 */
export type SessionInviteCode = {
  id: string
  sessionId: string
  playerId: string
  code: string
  createdAt: number
}
export type IdentityCheck = 'rtr-id' | 'qr' | 'phone'

/** A Player Information result the Add player sheet can save or add. Never carries a phone. */
export type DirectoryPlayer = {
  id: string
  fullName: string
  nickname: string | null
  rtrId: string
  identity: 'registered' | 'unclaimed'
  /** Their Player Information level, or null when they have none yet */
  suggestion: PlayingLevel | null
  /** "#214", or "Not ranked" */
  rankLabel: string
  phoneHidden?: boolean
}
