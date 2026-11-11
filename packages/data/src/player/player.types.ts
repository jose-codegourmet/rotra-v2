/** The nine playing levels, ordered from Beginner Low to Advanced High. */
export const PLAYING_LEVELS = [
  'beginner_low',
  'beginner_mid',
  'beginner_high',
  'intermediate_low',
  'intermediate_mid',
  'intermediate_high',
  'advanced_low',
  'advanced_mid',
  'advanced_high',
] as const

export type PlayingLevel = (typeof PLAYING_LEVELS)[number]

/** Public identity only. Contacts, account credentials and ranking calculations are separate. */
export type Player = {
  id: string
  fullName: string
  nickname: string | null
  rtrId: string
}

/** Official public history; fixtures contain only valid finalized sessions. */
export type PlayerGame = {
  id: string
  format: import('../match/match.types').MatchFormat
  partners: string[]
  opponents: string[]
  counting: 'counted' | 'fun' | 'partial'
  result: 'won' | 'lost'
  score: string | null
  note?: string
}
export type PlayerSessionRecord = {
  id: string
  title: string
  clubName: string
  finishedAt: string
  sessionPageUrl: string | null
  games: PlayerGame[]
}

export type PlayerRank = {
  playerId: string
  fullName: string
  nickname: string | null
  levelIndex: number | null
  state: 'provisional' | 'established' | 'needs_reassessment'
  updatePending: { sessionTitle: string; clubName: string; finishedAt: string } | null
  position: number | null
  recentCount: number
  olderCount: number
}

/** Who can see a profile: public, Private (today's switch) or always private (#715, mock only). */
export type ProfileVisibility = 'public' | 'private' | 'always_private'

/** Public profile only; private account and contact fields are deliberately excluded. */
export type PlayerProfile = {
  profilePrivate?: boolean
  /**
   * Always private (#715 proposal, used by #731): masked for every other viewer, signed in or not;
   * only the picture and banner stay public. Mock flag only: no database column yet, so real mode
   * reads it as not set. `profilePrivate` (today's Private switch) keeps its meaning.
   */
  profileAlwaysPrivate?: boolean
  /** Shown only on the signed-in player account, not public profile cards. */
  adminChangeNote?: string
  playerId: string
  rtrId: string
  fullName: string
  nickname: string | null
  /** Photo URL/data URL or character:<id>; null means initials. Resolve character references before display. */
  picture: string | null
  playingStyle: string
  experienceYears: number | null
  experienceMonths: number | null
  socialLinks: { facebook: string; instagram: string; youtube: string; linkedin: string }
}

/** Public-safe share-image participants; masked players carry no picture. */
export type PlayerShareParticipant = { name: string; picture: string | null }
export type PlayerShareGame = PlayerGame & {
  partnerPlayers?: PlayerShareParticipant[]
  opponentPlayers?: PlayerShareParticipant[]
}
