import type { MatchFormat } from '../match/match.types'
import {
  type WinChance,
  type WinChanceBreakdown,
  type WinChanceTeamBreakdown,
  winChanceBreakdown,
} from '../match/winChance.rules'
import type { PlayerForm } from '../session-roster/sessionRoster.types'
import type { PlayerGame, PlayingLevel } from './player.types'

/**
 * Win chance on a finished game in the Player app (D-2026-11-27-03): the Queue's win chance read
 * from the lasting signals only (level, club win rate, best day, leaderboard place and direction).
 * Never tonight's signals, never a handicap. One function feeds the list pill, the Game page's team
 * chips and the dialog rows, in mock mode and on the server in real mode, so they always agree.
 */

/** One person on a side: their level in that game and, with a club record, their lasting form. */
export type GameWinChanceFace = { level: PlayingLevel | null; form?: PlayerForm }

/** What a drawn game court carries: `a` is the left side. */
export type GameWinChance = { winChance: WinChance; upset: boolean }

/**
 * The id of a face in a game's breakdown: its side as drawn (`a` left, `b` right) and its place on
 * that side. Never a player id, so a guest has one too and nothing about the person is in it.
 */
export const gameFaceKey = (side: 'a' | 'b', index: number) => `${side}${index}`

/**
 * The breakdown of a finished game, Team A = the left side in the order given. Null without two
 * sides. A face with no `form` (a guest, or no club record) counts as its level only.
 */
export function gameWinChanceBreakdown(
  format: MatchFormat,
  left: readonly GameWinChanceFace[],
  right: readonly GameWinChanceFace[],
  winner: 'left' | 'right',
): WinChanceBreakdown | null {
  if (!left.length || !right.length) return null
  const teamA = left.map((_, i) => gameFaceKey('a', i))
  const teamB = right.map((_, i) => gameFaceKey('b', i))
  const players = [
    ...left.map((face, i) => ({ ...face, id: teamA[i] as string })),
    ...right.map((face, i) => ({ ...face, id: teamB[i] as string })),
  ]
  return winChanceBreakdown(
    {
      format,
      teamA,
      teamB,
      state: 'completed',
      decision: {
        kind: 'completed',
        winningTeam: winner === 'left' ? 'A' : 'B',
        teamAScore: null,
        teamBScore: null,
        confirmedAt: 0,
      },
    },
    players,
    [],
  )
}

/** The pill of a game court from its breakdown. */
export const gameWinChanceOf = (breakdown: WinChanceBreakdown | null): GameWinChance | null =>
  breakdown ? { winChance: breakdown.chance, upset: breakdown.upset } : null

/**
 * The pill fields of a `PlayerGame` (spread into it). Nothing for a partial game (not counted as a
 * result) or a game without two sides.
 */
export function gameWinChanceFields(
  game: Pick<PlayerGame, 'format' | 'counting' | 'result'>,
  left: readonly GameWinChanceFace[],
  right: readonly GameWinChanceFace[],
): Partial<GameWinChance> {
  if (game.counting === 'partial') return {}
  return (
    gameWinChanceOf(
      gameWinChanceBreakdown(game.format, left, right, game.result === 'won' ? 'left' : 'right'),
    ) ?? {}
  )
}

const flipChance = (chance: WinChance): WinChance => ({
  a: chance.b,
  b: chance.a,
  favored: chance.favored === 'A' ? 'B' : chance.favored === 'B' ? 'A' : null,
  strong: chance.strong,
})

/**
 * A breakdown as a court is drawn: `left` and `right` are its face ids in drawn order (the Game
 * page puts the signed-in player's side first, themselves first). The numbers do not change; only
 * the sides and the order of the faces do. Null when an id is not in the breakdown.
 */
export function drawnWinChanceBreakdown(
  breakdown: WinChanceBreakdown,
  left: readonly string[],
  right: readonly string[],
): WinChanceBreakdown | null {
  const first = left[0]
  if (!first) return null
  const flipped = breakdown.teamB.players.some((p) => p.id === first)
  const [mine, theirs] = flipped
    ? [breakdown.teamB, breakdown.teamA]
    : [breakdown.teamA, breakdown.teamB]
  const ordered = (
    team: WinChanceTeamBreakdown,
    ids: readonly string[],
  ): WinChanceTeamBreakdown | null => {
    const players = ids.flatMap((id) => team.players.find((p) => p.id === id) ?? [])
    return players.length === ids.length && players.length === team.players.length
      ? { players, average: team.average }
      : null
  }
  const teamA = ordered(mine, left)
  const teamB = ordered(theirs, right)
  if (!teamA || !teamB) return null
  return {
    ...breakdown,
    chance: flipped ? flipChance(breakdown.chance) : breakdown.chance,
    teamA,
    teamB,
  }
}
