import type { PlayerCharacterId } from '../player/picture'
import type { PlayingLevel } from '../player/player.types'

/** Optional gender (D-2026-11-19-01); decides the match category. Not given reads as null. */
export type Gender = 'male' | 'female'

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

/**
 * What a club entered about its own unclaimed player besides the name, nickname, picture and level
 * (D-2026-11-16-04): each club keeps its own version and no club is shown another club's.
 */
export type ClubPlayerOwnDetails = {
  playingStyle: string
  experienceYears: number | null
  experienceMonths: number | null
  socialLinks: { facebook: string; instagram: string; youtube: string; linkedin: string }
}

/**
 * A club's saved player. Four statuses (D-2026-11-16-04), told by `identity` and `playerId`:
 * - `guest`: a name only. No email, no phone, no `playerId`, no RTR ID.
 * - `unclaimed` with a `playerId`: saved with an email. `playerId` is the shared entry for that
 *   email (one email, one person, one RTR ID across clubs); the name, nickname, picture, level and
 *   phone here are this club's own.
 * - `unclaimed` without a `playerId`: an older record with a phone and no email (Details required).
 * - `registered`: linked to a ROTRA account (`playerId`). Verified sits on top of registered.
 * - `pending`: Lookup pending, a new player entered with an email while offline; ROTRA links them
 *   or gives them an RTR ID when the device syncs.
 */
export type ClubPlayer = {
  addedAt?: number
  id: string
  clubId: string
  playerId: string | null
  fullName: string
  nickname: string | null
  /**
   * The club's own nickname for a registered player (D-2026-11-18-03): kept on this record, used in
   * every session of the club, shown on Queue Master screens only. Empty or missing = none. Guests
   * and unclaimed players never have one: the `nickname` above is already the club's.
   */
  clubNickname?: string | null
  identity: 'registered' | 'unclaimed' | 'guest' | 'pending'
  playingLevel: PlayingLevel | null
  /**
   * Optional gender the club gave for this player (D-2026-11-19-01). Missing or null = not given,
   * which makes any match with them Genderless. Real mode has no column yet: always missing.
   */
  gender?: Gender | null
  /** The club deleted this saved player; history still points at it (mock store only) */
  removedAt?: number
  joinedVia?: JoinedVia
  /**
   * Set (with `removedAt`) when the Queue Master moved this record into another saved player (the
   * Same person step: the email typed for it already belonged to that player): its slots, waitlist
   * spots, games, requests and payments now point at that record, and this row is hidden.
   */
  linkedToClubPlayerId?: string
  /** Club-set picture; registered players never carry one (their own profile picture shows). */
  picture?: ClubPlayerPicture
  /** The club's own playing style, experience and links for an unclaimed player (mock store only) */
  details?: ClubPlayerOwnDetails
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
  /** The club's own phone for an unclaimed player is on file; a guest never has one */
  phoneOnFile: boolean
  /** Gender the club gave (D-2026-11-19-01); null or missing = not given */
  gender?: Gender | null
  /** Level for this club (the saved level, or the latest session one); null for none yet */
  level: PlayingLevel | null
  /**
   * Edit details › Profile picture: what shows now and the previous photo, if any
   * (D-2026-11-09-12; stored on `club_players.avatar_ref` in real mode).
   */
  picture?: ClubPlayerPictureState
  /**
   * The club's own details. Null for a guest. `email` is the one on file ('' for an older record
   * with none: Details required); once saved it is read-only for the club (D-2026-11-16-04).
   */
  profile: (ClubPlayerOwnDetails & { email: string }) | null
}
/**
 * Edit details as typed; experience stays text like the profile forms. `email` is taken only when
 * none is on file (it makes a guest or an older record unclaimed); `phone` only for an unclaimed
 * player with none on file.
 */
export type ClubPlayerDetailsInput = {
  fullName: string
  nickname: string
  /** Optional gender: 'male', 'female' or '' for not given */
  gender?: Gender | ''
  /** Level for this club: a playing level code, or '' for none */
  level: string
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

/**
 * Save details' answer. `message` is the toast ("Details saved · NAME", plus what the email did:
 * "· unclaimed · RTR-…", "· linked to their ROTRA account", "· already on ROTRA · RTR-…" or
 * "· profile lookup after sync"). `samePerson` is set when the email typed already belongs to
 * another saved player of this club: the other details were saved, the email was not, and the
 * screen asks "Same person as NAME?" before `moveSavedPlayer`.
 */
export type ClubPlayerDetailsResult = {
  clubPlayerId: string
  message?: string
  samePerson?: { clubPlayerId: string; name: string } | null
}
