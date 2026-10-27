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
