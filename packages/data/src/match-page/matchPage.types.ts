import type { MatchFormat } from '../match/match.types'
import type { PlayerGame, PlayerSessionRecord } from '../player/player.types'
import type { PublicSessionParticipant } from '../public-session/publicSession.types'

/** A side of the match as Queue recorded it: Team A or Team B. */
export type MatchSide = 'a' | 'b'

/**
 * The public match page (`/matches/[matchId]`): one match of a valid finalized session, the same
 * page for every player in it. Only matches that show on profile games (P-MATCH-HISTORY) have one;
 * anything else reads as not found. Faces follow the profile privacy rules for the viewer
 * (D-2026-11-12-01), applied where the read is answered.
 */
export type MatchPage = {
  /** The Queue match, shared by every player in it: the `id` of that game on each player's games */
  matchId: string
  format: MatchFormat
  /**
   * The match as a whole: `fun` for a fun format, `not_ranked` in a session run with Record games
   * off (D-2026-11-20-02), else `counted`. `partial` belongs to one player's participation, so it
   * is on that player (`MatchPagePlayer.counting`), never here.
   */
  counting: Exclude<PlayerGame['counting'], 'partial'>
  /** Read from Team A's side ("21–18"); null when no score was entered (the winner still is) */
  score: string | null
  /** Best of 3 (Q22): every game score from Team A's side, play order. Unset when not recorded. */
  gameScores?: string[]
  winner: MatchSide
  session: MatchPageSession
  /** On court when the match ended, in Queue's order */
  teamA: MatchPagePlayer[]
  teamB: MatchPagePlayer[]
  /**
   * The signed-in player, or null for a visitor. When they played in this match, the page puts
   * their side first as "You" (compare with each face's `playerId`).
   */
  viewerPlayerId: string | null
}

/** The session the match belongs to, as on profile games. */
export type MatchPageSession = Omit<PlayerSessionRecord, 'games' | 'ranked'> & {
  /** False for a session run with Record games off (not ranked) */
  ranked: boolean
}

/** One person on the court, as this viewer may see them. */
export type MatchPagePlayer = {
  /** Null for a guest or someone with no ROTRA profile */
  playerId: string | null
  /** Masked ("J*** A***") when the profile privacy rules hide it from this viewer */
  name: string
  /** Photo URL/data URL (characters already resolved); null for initials and for guests */
  picture: string | null
  /** The level they played at that night, as a group; null when unrated, hidden or a guest */
  skillGroup: PublicSessionParticipant['skillGroup']
  /** Their games in the session up to and including this match (1 for their first) */
  sessionGameNumber: number
  /**
   * This match as it counts for them, as on their profile games: `partial` when they played only
   * part of it (came in or left mid-game), else the match's `counting`. The court reads Won / Lost
   * and the note from the left side, so the page takes it from the left player.
   */
  counting: PlayerGame['counting']
  /** Their game row's note for this match ("Came in mid-game for Troy"), when one was recorded */
  note?: string
  /**
   * Their games in the same session before this match, play order, each read from their side like
   * profile games (faces filled and masked for this viewer). Empty when their games are hidden
   * from this viewer (always private, or private to a visitor) or none came before.
   */
  earlierGames: PlayerGame[]
}
