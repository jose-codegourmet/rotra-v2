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

/** Public profile only; private account and contact fields are deliberately excluded. */
export type PlayerProfile = {
  playerId: string
  rtrId: string
  fullName: string
  nickname: string | null
  picture: string | null
  playingStyle: string
  experienceYears: number | null
  experienceMonths: number | null
  socialLinks: { facebook: string; instagram: string; youtube: string; linkedin: string }
}
