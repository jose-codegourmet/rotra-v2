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
  /**
   * Set games played (#717): requested − games counted from completed matches at override time, so
   * the shown count (`gamesPlayed` in match.rules) keeps counting up afterwards. May be negative;
   * missing or 0 means no override.
   */
  gamesAdjustment?: number
}
export type SessionWaitlistEntry = {
  id: string
  sessionId: string
  clubPlayerId: string
  level: PlayingLevel | null
  addedAt: number
}
/**
 * The player's choice on a join request (D-2026-11-11-02): `slot` = Join a slot, `waitlist` = Be
 * waitlisted, `from_waitlist` = a waitlisted Player asking for a slot (Join from waitlist). A slot
 * request is refused while every slot is taken. Requests from before the choice read `slot`.
 */
export type JoinRequestPlacement = 'slot' | 'waitlist' | 'from_waitlist'
export type SessionJoinRequest = {
  id: string
  sessionId: string
  name: string
  nickname: string | null
  phoneE164: string | null
  statedBand: 'beginner' | 'intermediate' | 'advanced' | 'unsure'
  placement: JoinRequestPlacement
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
  /**
   * The requesting Player's own profile picture as an avatar reference (their account's, read live);
   * null or missing for a guest or a Player without one, which shows initials.
   */
  picture?: string | null
  /** The Player's current full name, which seeds a character picture (like saved players' `pictureName`) */
  pictureName?: string | null
  /** The Session invite code the link carried (`?invite=`), read as “Invited by NAME” (D-2026-11-09-08). */
  inviteCodeId?: string | null
  /**
   * Guest linking (D-2026-11-09-06): the saved player the QM chose with **Link** on the phone-match
   * prompt; Confirm then gives that saved player the slot instead of creating a guest.
   */
  linkedClubPlayerId?: string | null
  /** When the QM tapped **Not them** on the phone-match prompt; the prompt stays hidden. */
  linkDeclinedAt?: number | null
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
  /** Their own profile picture as an avatar reference, or null for initials */
  picture: string | null
  /** Their Player Information level, or null when they have none yet */
  suggestion: PlayingLevel | null
  /** "#214", or "Not ranked" */
  rankLabel: string
  phoneHidden?: boolean
}

/**
 * One change of the roster burst batch (#718): the Queue Master's adds, removes and join-request
 * decisions of one burst, sent together in click order and applied on the server in one
 * transaction. Each carries its own `operationId`, so a retry of the batch repeats nothing.
 */
export type RosterBatchOperation =
  | {
      op: 'add'
      operationId: string
      source: 'saved'
      clubPlayerId: string
      level: PlayingLevel
      identityCheck?: IdentityCheck
    }
  | {
      op: 'add'
      operationId: string
      source: 'directory'
      playerId: string
      level: PlayingLevel
      identityCheck?: IdentityCheck
    }
  | {
      op: 'add'
      operationId: string
      source: 'new'
      name: string
      nickname?: string
      phone?: string
      level: PlayingLevel
    }
  | { op: 'remove'; operationId: string; rosterId: string }
  | { op: 'acceptRequest'; operationId: string; requestId: string; level: PlayingLevel }
  | { op: 'declineRequest'; operationId: string; requestId: string }
/** What one operation of the batch ended as: the saved roster row or waitlist entry, if any. */
export type RosterBatchResult = {
  operationId: string
  rosterId: string | null
  waitlistId: string | null
  clubPlayerId: string | null
}
