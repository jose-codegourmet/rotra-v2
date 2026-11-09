import type { PlayerCharacterId } from '../player/picture'
import type { PlayingLevel } from '../player/player.types'

/**
 * How a saved player joined the club (D-2026-11-09-06). Missing on older or story rows reads as
 * `added`; use `joinedViaOf` rather than reading the field directly.
 */
export type JoinedVia = 'club' | 'session' | 'added'

/**
 * The picture a club set for its own guest or unclaimed player (mock only, D-2026-11-09-12).
 * Characters and initials hold no file; `previousSrc` is the one previous photo kept
 * (D-2026-11-09-10). Mock photos are data URLs, as `updateClubLogo` stores them.
 */
export type ClubPlayerPicture = {
  kind: 'photo' | 'character' | 'initials'
  /** `photo` only */
  src?: string
  /** `character` only */
  characterId?: PlayerCharacterId
  previousSrc?: string
}

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
  joinedVia?: JoinedVia
  /**
   * Set (with `removedAt`) when the QM linked this guest to another saved player: its slots,
   * waitlist spots, games, requests and payments now point at that record, and this row is hidden.
   */
  linkedToClubPlayerId?: string
  /** Club-set picture; registered players never carry one (their own profile picture shows). */
  picture?: ClubPlayerPicture
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
  /**
   * Edit details › Profile picture: what shows now and the previous photo, if any. Mock only;
   * missing in real data mode until club-set picture storage is decided (D-2026-11-09-12).
   */
  picture?: ClubPlayerPictureState
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

/**
 * The Profile picture field's state: the current picture as an avatar reference (photo URL/data
 * URL, `character:<id>` or null for initials, resolved like `PlayerProfile.picture`) and the
 * previous photo when one is kept.
 */
export type ClubPlayerPictureState = {
  kind: 'photo' | 'character' | 'initials'
  reference: string | null
  characterId: PlayerCharacterId | null
  previousSrc: string | null
}

/** Edit details › Profile picture commands; a photo is read in the browser (mock: data URL). */
export type SetClubPlayerPictureInput =
  | { clubPlayerId: string; kind: 'photo'; file: File }
  | { clubPlayerId: string; kind: 'character'; characterId: PlayerCharacterId }
