/** One ordered standings row of the result snapshot; positions are unique (no shared ranks). */
export type StandingRow = {
  position: number
  sessionPlayerId: string
  clubPlayerId: string
  name: string
  wins: number
  losses: number
  games: number
}
/** Per club player award history: prior completed sessions at this club and the baseline win rate they give. */
export type PlayerAwardHistory = {
  clubPlayerId: string
  /** Previous completed sessions at the same club within the preceding three months (this session excluded). */
  priorSessions: number
  /** Win rate over those sessions; null until five qualify. */
  baselineWinRate: number | null
}
/** An award line. `playerId` is null for a guest: the row carries no profile link. */
export type AwardRow = {
  sessionPlayerId: string
  clubPlayerId: string
  playerId: string | null
  name: string
  /** Counted games tonight. */
  games: number
  /** Prototype performance score: Σ (won − expected). */
  score: number
}
/** Most Improved or Off Day line: tonight's win rate against the club baseline. */
export type ImprovementRow = AwardRow & {
  priorSessions: number
  baselineWinRate: number
  winRate: number
  /** winRate − baselineWinRate */
  delta: number
}
export type SessionAwards = {
  mvp: AwardRow | null
  mostImproved: ImprovementRow | null
  offDay: ImprovementRow[]
}
/** Private snapshot generated at the finalization `slides` stage; an invalid session never has one. */
export type SessionResultSnapshot = {
  sessionId: string
  standings: StandingRow[]
  awards: SessionAwards
  calculationVersion: 'prototype-reference'
  /** Prior club sessions per roster club player at generation time (clubPlayerId → count). */
  priorSessionCounts: Record<string, number>
  generatedAt: number
}
export type PublishedSlide = 'standings' | 'awards'
/** The current publication: each publish replaces the selection, and Off Day is never carried over. */
export type SessionPublication = {
  sessionId: string
  publishedSlides: PublishedSlide[]
  includeOffDay: boolean
  publishedAt: number
}
/** Append-only publication log so earlier Off Day consent stays auditable. */
export type SessionPublicationEvent = {
  id: string
  sessionId: string
  clubId: string
  publishedSlides: PublishedSlide[]
  includeOffDay: boolean
  at: number
}
export type PublishResultsInput = {
  sessionId: string
  publishedSlides: PublishedSlide[]
  /** Must be passed explicitly on every publish; the UI always starts it unchecked. */
  includeOffDay: boolean
}
export type ExportFormat = 'story' | 'feed'
/** What Download images builds frames from; Off Day is off for every export until chosen. */
export type ExportSelection = {
  slides: PublishedSlide[]
  includeOffDay: boolean
}
/** One image of a Download images export: its title and the lines it lists. */
export type ExportFrame = {
  title: string
  rows: string[]
}
