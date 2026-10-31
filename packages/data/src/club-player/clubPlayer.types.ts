import type { PlayingLevel } from '../player/player.types'

/** Saved club roster identity; a guest has no global player link. */
export type ClubPlayer = {
  addedAt?: number
  id: string
  clubId: string
  playerId: string | null
  fullName: string
  nickname: string | null
  identity: 'registered' | 'unclaimed' | 'guest' | 'pending'
  playingLevel: PlayingLevel | null
}

/** Unfiltered Saved players overview for one club. */
export type SavedPlayerStats = {
  totalPlayers: number
  totalRegistered: number
  totalBeginners: number
  totalIntermediates: number
  totalAdvanced: number
  newPlayersThisWeek: number
}
