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
   * The club nickname of the linked registered saved player (D-2026-11-18-02). Derived by the
   * Queue Master roster read and by mutation helpers (`withClubNickname`); never stored on the
   * roster row and never present in public or player reads. Missing = none (the real Queue Master
   * roster and match reads send it since P15.8).
   */
  clubNickname?: string | null
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
/**
 * No show (cancelled): a live roster player who was away, played no games and was in no match,
 * taken off tonight's roster at `noShowAt`; their slot opens. Back to roster restores the row while
 * a slot is free. Real mode stores `session_players.no_show_at` (#839); the mock keeps the row aside.
 */
export type SessionNoShow = SessionPlayer & { noShowAt: number }
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
/**
 * A Player lookup result the Add player sheet can save or add (D-2026-11-16-04): a registered or an
 * unclaimed ROTRA player found by their exact RTR ID or exact email. A guest is never found. Never
 * carries a phone or an email.
 */
export type DirectoryPlayer = {
  /** The public player id: what the add commands take as `playerId` */
  id: string
  /** '' for another club's unclaimed player: no club is shown another club's name */
  fullName: string
  nickname: string | null
  rtrId: string
  identity: 'registered' | 'unclaimed'
  /** Their own profile picture as an avatar reference, or null for initials (always null for unclaimed) */
  picture: string | null
  /** Their Player Information level, or null when they have none yet (always null for unclaimed) */
  suggestion: PlayingLevel | null
  /** "#214", or "Not ranked" */
  rankLabel: string
  phoneHidden?: boolean
  /**
   * Another club's unclaimed player: "Not registered yet" with the RTR ID only. The add commands
   * then need `name`, this club's own name for them.
   */
  ownNameRequired?: boolean
}

/**
 * What Player lookup answers for one query. `player` is the one match that can be added. When the
 * exact RTR ID or email belongs to someone already in this club's saved players, `player` is null
 * and `savedName` is this club's name for them ("NAME is already in your saved players."). Both
 * null: nothing typed yet, or "No ROTRA player has that RTR ID or email."
 */
export type PlayerLookup = { player: DirectoryPlayer | null; savedName: string | null }

/** Add anyway / Add to waitlist on a full roster (#735, D-OVERFILL); omitted on an ordinary add. */
type AddPlacementFlags = { allowOverfill?: boolean; toWaitlist?: boolean }
/**
 * One change of the roster burst batch (#718): the Queue Master's adds, removes and join-request
 * decisions of one burst, sent together in click order and applied on the server in one
 * transaction. Each carries its own `operationId`, so a retry of the batch repeats nothing.
 */
export type RosterBatchOperation =
  | (AddPlacementFlags & {
      op: 'add'
      operationId: string
      source: 'saved'
      clubPlayerId: string
      level: PlayingLevel
    })
  | (AddPlacementFlags & {
      op: 'add'
      operationId: string
      source: 'directory'
      playerId: string
      /** This club's own name for another club's unclaimed player (`ownNameRequired`) */
      name?: string
      level: PlayingLevel
    })
  | (AddPlacementFlags & {
      op: 'add'
      operationId: string
      source: 'new'
      name: string
      nickname?: string
      /** No email saves a guest; an email saves an unclaimed player or links a ROTRA player */
      email?: string
      level: PlayingLevel
    })
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
