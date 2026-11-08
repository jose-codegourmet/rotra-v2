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
  /** The club deleted this saved player; history still points at it (mock store only) */
  removedAt?: number
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

/** Queue › Saved players › Edit details: what the club entered for a guest or unclaimed player. */
export type ClubPlayerDetails = {
  clubPlayerId: string
  identity: 'guest' | 'pending' | 'unclaimed'
  fullName: string
  nickname: string | null
  phoneOnFile: boolean
  /** Unclaimed profiles only */
  profile: {
    email: string
    playingStyle: string
    experienceYears: number | null
    experienceMonths: number | null
    socialLinks: { facebook: string; instagram: string; youtube: string; linkedin: string }
  } | null
}
/** Edit details as typed; experience stays text like the profile forms */
export type ClubPlayerDetailsInput = {
  fullName: string
  nickname: string
  phone: string
  email: string
  playingStyle: string
  experienceYears: string
  experienceMonths: string
  facebook: string
  instagram: string
  youtube: string
  linkedin: string
}

/** What Delete player would affect. Only `activeSession` asks for confirmation (D-DELETE-PLAYER). */
export type DeleteImpact = {
  activeSession: { title: string; waitingMatches: number } | null
  /** On court or playing: deleting is refused until that match is done */
  busy: boolean
}
