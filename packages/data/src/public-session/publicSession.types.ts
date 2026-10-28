import type { SessionMode } from '../queue-session/queueSession.types'
import type { SessionJoinRequest } from '../session-roster/sessionRoster.types'

/** A confirmed person on the public page: no phone, level, presence, games or notes. */
export type PublicSessionParticipant = {
  name: string
  /** Uploaded picture of a registered or unclaimed player; guests never have one */
  pictureUrl?: string | null
  /** Registered and unclaimed players; a guest has no profile */
  hasRotraProfile: boolean
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
 * state. Private data (Off Day unless included, costs, phones, levels, presence) never enters it.
 */
export type PublicSessionPage = {
  slug: string
  status: 'prepared' | 'active' | 'completed' | 'invalid'
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
  participants: PublicSessionParticipant[]
  /** Waitlisted names, in the order they joined */
  waitlist: string[]
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
}
/** This visitor's own request on a session page, remembered for the page visit. */
export type MyJoinRequest = {
  requestId: string
  name: string
  status: SessionJoinRequest['status']
  /** 1-based waitlist position once confirmed onto the waitlist; null otherwise */
  waitlistPosition: number | null
}
