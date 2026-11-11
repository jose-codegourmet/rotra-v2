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

/**
 * Who can see a profile (D-2026-11-12-01, `players.profile_visibility`): `public`; `private` (the
 * default for new registrations: visitors see a masked name, signed-in players the profile);
 * `always_private` (name, level and games masked for everyone but the player and the Queue Master of
 * a session they joined; picture and banner stay public).
 */
export type ProfileVisibility = 'public' | 'private' | 'always_private'

/** Public profile only; private account and contact fields are deliberately excluded. */
export type PlayerProfile = {
  /** Unset on an identity without a stored level reads as `public` (existing fixture identities). */
  profileVisibility?: ProfileVisibility
  /**
   * Hide me from Player Information (`players.hidden_from_directory`): left out of Queue's Add player
   * › Player Information search, RTR ID search and public club member lists. Default false.
   */
  hiddenFromDirectory?: boolean
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
  /** The resolved banner's uploaded 3:1 image; null for a seeded banner drawn from theme tokens */
  bannerImageUrl?: string | null
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
