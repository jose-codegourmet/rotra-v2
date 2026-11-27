import type { Gender } from '../club-player/clubPlayer.types'
import type { LeaderboardPlace } from '../leaderboard/leaderboard.types'

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

/**
 * Getting-to-know answers (D-2026-11-19-11). The ids match the prototype and @rotra/ui's chip lists
 * (COURT_POS, SKILLS, FAV_PLAYERS); @rotra/data does not import @rotra/ui, so they are repeated here.
 */
export const COURT_POSITIONS = ['front', 'back', 'all'] as const
export type CourtPosition = (typeof COURT_POSITIONS)[number]

/** The 12 listed shots, in the prototype's order. */
export const SHOT_IDS = [
  'netting',
  'smash',
  'jump',
  'drop',
  'slice',
  'clear',
  'drive',
  'lift',
  'netkill',
  'push',
  'block',
  'backhand',
] as const
export type ShotId = (typeof SHOT_IDS)[number]

/** The nine listed favourite players plus `other` (then `favoritePlayerOther` holds the name). */
export const FAVORITE_PLAYER_IDS = [
  'lindan',
  'lcw',
  'axelsen',
  'momota',
  'taufik',
  'chenlong',
  'marin',
  'tty',
  'anseyoung',
  'other',
] as const
export type FavoritePlayerId = (typeof FAVORITE_PLAYER_IDS)[number]

/** Public identity only. Contacts, account credentials and ranking calculations are separate. */
export type Player = {
  id: string
  fullName: string
  nickname: string | null
  rtrId: string
}

/** Official public history; fixtures contain only valid finalized sessions. */
export type PlayerGame = {
  /**
   * The match: the same for every player in it, so `/matches/${id}` is its match page. Real mode
   * sends the Queue match id; in mock mode each fixture game is its own match.
   */
  id: string
  format: import('../match/match.types').MatchFormat
  partners: string[]
  opponents: string[]
  /**
   * `not_ranked`: a full singles or doubles game of a session run with Record games off
   * (D-2026-11-20-02). It shows with its win or loss, but like `fun` it never counts toward the
   * leaderboards, win rate, rank or game counts. Set by the real read.
   */
  counting: 'counted' | 'fun' | 'partial' | 'not_ranked'
  result: 'won' | 'lost'
  score: string | null
  /** Best of 3 (Q22): every game score read from the player's side ("21–18"), play order; `score` then holds games won. */
  gameScores?: string[]
  note?: string
  /**
   * Faces on the game court (2026-11-13 game row log), in the order of `partners` / `opponents`.
   * `playerId` is null for a guest or someone with no ROTRA profile. Set by both the mock and the
   * real read (an always-private player's name is masked there, the picture stays); when missing
   * the court draws names only.
   */
  partnerPlayers?: PlayerGamePlayer[]
  opponentPlayers?: PlayerGamePlayer[]
  /**
   * The profile owner's games in that session up to and including this one (2026-11-14 games badge
   * log): 1 for their first game that night. Set by both the mock and the real read.
   */
  sessionGameNumber?: number
  /**
   * Win chance (D-2026-11-27-03): each side's chance as the court is drawn, `a` = the left side
   * (the profile owner's), from the lasting signals only (`gameWinChance.rules`). Missing on a
   * partial game, on a game without two sides, and on reads outside ROTRA Player.
   */
  winChance?: import('../match/winChance.rules').WinChance
  /** With `winChance`: the Favored side (65% or more) lost this game. */
  upset?: boolean
}
/**
 * One person on a game court: the picture follows the profile privacy rules (null when masked);
 * `sessionGameNumber` is that person's games in the session up to and including this game.
 */
export type PlayerGamePlayer = PlayerShareParticipant & {
  playerId?: string | null
  sessionGameNumber?: number
}
export type PlayerSessionRecord = {
  id: string
  title: string
  clubName: string
  finishedAt: string
  sessionPageUrl: string | null
  /** False for a session run with Record games off (not ranked). Missing reads as true. */
  ranked?: boolean
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

/**
 * Who can see a profile (D-2026-11-12-01, `players.profile_visibility`): `public`; `private` (the
 * default for new registrations: visitors see a masked name, signed-in players the profile);
 * `always_private` (name, level and games masked for everyone but the player and the Queue Master of
 * a session they joined; picture and banner stay public).
 */
export type ProfileVisibility = 'public' | 'private' | 'always_private'

/** Public profile only; private account and contact fields are deliberately excluded. */
export type PlayerProfile = {
  leaderboardPlaces?: LeaderboardPlace[]
  /** The one club whose version of an unclaimed player is public. */
  unclaimedSavedBy?: string
  /**
   * D-2026-11-23-07: whether a registered player is verified (the three checks or Verified by
   * Admin). The result only; unset for an unclaimed player.
   */
  verified?: boolean
  /** Unset on an identity without a stored level reads as `public` (existing fixture identities). */
  profileVisibility?: ProfileVisibility
  /**
   * Hide me from Player Information (`players.hidden_from_directory`): left out of Queue's Add player
   * › Player Information search, RTR ID search and public club member lists. Default false.
   */
  hiddenFromDirectory?: boolean
  /**
   * Privacy and contact › Show my profile stats (2026-11-13-player-stats-visibility,
   * `players.show_profile_stats`). Unset or true shows Latest stats on the profile card to others;
   * false hides it from everyone but the player.
   */
  showProfileStats?: boolean
  /**
   * Privacy and contact › Show my weekly performance (`players.show_weekly_performance`).
   * Unset or true shows the Weekly Performance chart (profile, Games page) to others.
   */
  showWeeklyPerformance?: boolean
  /** Shown only on the signed-in player account, not public profile cards. */
  adminChangeNote?: string
  playerId: string
  rtrId: string
  fullName: string
  nickname: string | null
  /** Photo URL/data URL or character:<id>; null means initials. Resolve character references before display. */
  picture: string | null
  /**
   * The chosen Profile banner (`players.banner_id`, a `profile_banners` id); null or unset = the
   * default banner. Public, like the picture.
   */
  bannerId?: string | null
  /**
   * The banner the profile card draws (a ProfileBanner key or an uploaded banner's id), after the
   * default rule: a chosen banner is kept even when hidden or deleted; null → Court while it is
   * shown, else the first shown banner (resolveProfileBanner). Set on every profile read.
   */
  bannerKey?: string
  /** The resolved banner's uploaded 5:2 image; null for a seeded banner drawn from theme tokens */
  bannerImageUrl?: string | null
  playingStyle: string
  /**
   * Gender (D-2026-11-19-01): male, female, or null when not added yet. Public. Unset reads as
   * null. Real mode has no column yet (#1089), so the real read leaves it unset.
   */
  gender?: Gender | null
  /**
   * Getting-to-know answers (D-2026-11-19-11), all public and skippable; unset reads as nothing
   * answered. Real mode reads them from `players.personal_details` (D-2026-11-19-11).
   */
  /** Where you play: front, back or all-round. */
  playStyle?: CourtPosition | null
  /** Listed shots the player knows. */
  shots?: ShotId[]
  /** The player's own shots typed under Others: up to 6, 24 characters each. */
  shotsOther?: string[]
  favoritePlayer?: FavoritePlayerId | null
  /** The typed name when `favoritePlayer` is `other`; empty otherwise. */
  favoritePlayerOther?: string
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
