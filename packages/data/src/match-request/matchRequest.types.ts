import type { MatchFormat } from '../match/match.types'
import type { PlayingLevel } from '../player/player.types'
import type { DropOutNotice, SessionJoinRequest } from '../session-roster/sessionRoster.types'

/**
 * **Request a match** from a present, signed-in, confirmed Player (D-2026-11-09-05). Ids are roster
 * rows (`SessionPlayer.id`), like a match's teams. `partners` has one entry per partner spot the
 * format needs and `opponents` one per opponent spot; `null` is an “Anyone” spot. One open request
 * per player. `closed`: closed by itself (anyone named stopped being present, I'm leaving, or the
 * session ended); kept on the record, hidden.
 */
export type MatchRequest = {
  id: string
  sessionId: string
  pid: string
  format: MatchFormat
  partners: (string | null)[]
  opponents: (string | null)[]
  at: number
  status: 'open' | 'added' | 'declined' | 'cancelled' | 'closed'
  decidedAt: number | null
  /** The waiting match the QM's Add to queue made (`added` only) */
  matchId: string | null
}

/** What Send request carries; the spots are padded or refused to fit the format. */
export type SendMatchRequestInput = {
  playerId: string
  format: MatchFormat
  partners: (string | null)[]
  opponents: (string | null)[]
}

/** Where a named player is right now: on a court (On court or Playing) or in the Main Queue. */
export type MatchRequestWhere =
  | { kind: 'court'; courtLabels: string }
  | { kind: 'queue'; position: number }
  | null

/** One named spot on a QM match request card. */
export type MatchRequestSpot = {
  rosterId: string
  name: string
  nickname: string | null
  level: PlayingLevel | null
  /** Counted games so far, read against `SessionRequests.minimum` */
  games: number
  /** “On Court 2” / “In queue #3”, or null */
  where: MatchRequestWhere
}

/** A spot on the card: a named player, or null for “Anyone”. */
export type MatchRequestCardSpot = MatchRequestSpot | null

export type MatchRequestView = {
  id: string
  format: MatchFormat
  at: number
  requester: MatchRequestSpot
  partners: MatchRequestCardSpot[]
  opponents: MatchRequestCardSpot[]
}

export type JoinRequestView = SessionJoinRequest & {
  /**
   * A signed-in Player's request: `inClub` true reads “ROTRA player · already in your club”, false
   * “ROTRA player · new to your club”. null for a guest request.
   */
  account: { playerId: string; inClub: boolean } | null
  /** “Invited by NAME”, or null */
  invitedByName: string | null
}

export type DropOutNoticeView = DropOutNotice & {
  name: string
  nickname: string | null
}

/**
 * The roster's own-action mark: “Checked in themselves · TIME” or “Left · TIME”. The QM's last
 * presence change after it clears it.
 */
export type SelfCheckInMark = { kind: 'checked-in'; at: number } | { kind: 'left'; at: number }

/** Q-REQUESTS read model (Q18); see `useSessionRequests`. */
export type SessionRequests = {
  sessionId: string
  /** The session's minimum games, for “N of MIN games” on match request cards */
  minimum: number
  counts: {
    /** The Requests · N button: pending join requests + open drop-out notices + open match requests */
    total: number
    /** The Join tab: pending join requests + open drop-out notices */
    join: number
    joinRequests: number
    dropOuts: number
    /** The Match tab */
    match: number
  }
  /** Pending join requests, oldest first */
  join: JoinRequestView[]
  /** Open drop-out notices, oldest first (“Can't make it · N” at the top of Join) */
  dropOuts: DropOutNoticeView[]
  /** Open match requests, oldest first */
  match: MatchRequestView[]
  /** Roster row id → its own-action mark; rows without one are absent */
  selfCheckIn: Record<string, SelfCheckInMark>
}
