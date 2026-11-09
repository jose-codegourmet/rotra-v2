import type { MatchFormat } from '../match/match.types'
import type { PlayingLevel } from '../player/player.types'
import type { SessionMode } from '../queue-session/queueSession.types'
import type { SessionJoinRequest } from '../session-roster/sessionRoster.types'

/** Public-safe participant or waitlist entry. */
export type PublicSessionParticipant = {
  /** Masked on the server (`maskPublicName`): "J*** A***". The full name never enters the page. */
  name: string
  /** Uploaded picture of a registered or unclaimed player; guests never have one */
  pictureUrl?: string | null
  skillGroup: 'beginner' | 'intermediate' | 'advanced' | null
  /** Full playing level for the avatar hover label, or null when unrated. */
  levelLabel: string | null
}
/**
 * #474: aggregate counts of public participants in each skill group. Missing level → unrated.
 */
export type PublicSkillMix = {
  beginner: number
  intermediate: number
  advanced: number
  unrated: number
}
/** A published standings row: position and counts only, no internal ids. */
export type PublicStandingRow = {
  position: number
  name: string
  wins: number
  losses: number
  games: number
}
/** One Off Day name, present only when the publication explicitly included Off Day. */
export type PublicOffDayRow = { name: string; priorSessions: number }
/** Only the published slides; each key is absent when that slide was not published. */
export type PublicSessionResults = {
  standings?: PublicStandingRow[]
  awards?: {
    mvp: { name: string } | null
    mostImproved: { name: string; priorSessions: number } | null
  }
  offDay?: PublicOffDayRow[]
}
/**
 * Q-PUBLIC-*: the public-safe projection of a session by its slug, built from the last synced
 * state. Private data (Off Day unless included, costs, phones, presence) never enters it.
 */
export type PublicSessionPage = {
  slug: string
  status: 'prepared' | 'active' | 'completed' | 'invalid' | 'cancelled'
  /** The cancel reason shown on a cancelled page; null or missing when none was given. */
  cancelReason?: string | null
  title: string
  start: number
  end: number
  club: { name: string; initials: string; logoUrl?: string | null }
  venue: { name: string; address?: string | null }
  /** Court labels in order */
  courts: string[]
  formats: { singles: boolean; doubles: boolean }
  mode: SessionMode
  minimum: number
  notes?: string | null
  /** Total before the anonymous 12-tile server cap. */
  participantCount?: number
  participants: PublicSessionParticipant[]
  /** Aggregate skill-group counts over the full confirmed roster (never the waitlist), #474 */
  skillMix: PublicSkillMix
  /** Public-safe waitlisted players in waitlist order. */
  waitlist: PublicSessionParticipant[]
  openSlots: number
  slotBudget: number
  acceptJoinRequests: boolean
  lastSyncedAt: number
  /** The operator's device has changes that have not synced yet */
  hasPendingChanges: boolean
  /** null until results are published (always null for prepared, active and invalid sessions) */
  results: PublicSessionResults | null
}
/** What a guest types in Request to join; the phone is already normalised (E.164) or null. */
export type SendJoinRequestInput = {
  name: string
  nickname?: string | null
  phone?: string | null
  statedBand: SessionJoinRequest['statedBand']
  /** Generated once per open sheet; real mode sends it so a retry saves one request */
  requestId?: string
}
/** This visitor's own request on a session page, remembered for the page visit. */
export type MyJoinRequest = {
  requestId: string
  name: string
  status: SessionJoinRequest['status']
  /** 1-based waitlist position once confirmed onto the waitlist; null otherwise */
  waitlistPosition: number | null
}

/** Narrow Player-hosted projection; never a club session or operator data. */
export type PlayerSessionAccess = {
  playerId: string
  fullRoster: boolean
  participants: PublicSessionParticipant[]
  queue: {
    matchNo: number
    format: MatchFormat
    teamA: { name: string; level: PlayingLevel | null }[]
    teamB: { name: string; level: PlayingLevel | null }[]
  }[]
}

/**
 * A signed-in ROTRA Player acting on a session page (Q17.2). `playerId` is the authenticated
 * Player profile; the server checks it is linked to an unreleased slot where the write needs one.
 */
export type PlayerSessionInput = { playerId: string }
/** **Request to join as NAME**; `inviteCode` is the link's `?invite=` code, when it had one. */
export type JoinAsPlayerInput = PlayerSessionInput & { inviteCode?: string | null }
