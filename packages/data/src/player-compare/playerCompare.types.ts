import type { MatchFormat } from '../match/match.types'
import type { PlayerProfile, PlayerRank, PlayingLevel } from '../player/player.types'

export type PlayerCompareFilter = 'all' | 'h2h' | 'together'
export type PlayerCompareOptions = { filter?: PlayerCompareFilter; page?: number }

export type SharedGamePlayer = {
  /** Session roster identity; guests may have no global player identity. */
  id: string
  playerId: string | null
  name: string
  pictureUrl: string | null
  /** Full name used to resolve a character reference; name may be a nickname. */
  pictureName?: string
  level: PlayingLevel | null
  games: number
}

/** A final counted match, with the signed-in player's side always on the left. */
export type SharedPlayerGame = {
  id: string
  format: Extract<MatchFormat, 'singles' | 'doubles'>
  mine: SharedGamePlayer[]
  theirs: SharedGamePlayer[]
  meWon: boolean
  together: boolean
  /** Score in mine–theirs order, absent when no score was recorded. */
  score: string | null
  finishedAt: string
  sessionId: string
  sessionTitle: string
  clubId: string
  clubName: string
}

export type PlayerCompareStats = {
  games: number
  myWins: number
  otherWins: number
  myWinRate: number | null
  otherWinRate: number | null
}

export type ComparePlayer = {
  profile: Pick<PlayerProfile, 'playerId' | 'fullName' | 'nickname' | 'picture'>
  /** The existing rank reader's result, without any compare-specific ranking calculation. */
  rank: PlayerRank | null
  overallWinRate: number | null
}

export type PlayerCompare = {
  viewer: ComparePlayer
  other: ComparePlayer
  counts: Record<PlayerCompareFilter, number>
  stats: Record<PlayerCompareFilter, PlayerCompareStats>
  filter: PlayerCompareFilter
  /** Zero is the newest page. The returned page is clamped to the available results. */
  page: number
  pageSize: number
  total: number
  games: SharedPlayerGame[]
}
