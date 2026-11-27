import { PLAYING_LEVELS } from '../player/player.types'
import { handicapLabel, handicapSpotsOf } from '../session-roster/handicap.rules'
import { levelLabel } from '../session-roster/sessionRoster.rules'
import type { PlayerForm, SessionPlayer } from '../session-roster/sessionRoster.types'
import { countedTeam } from './match.rules'
import type { Match, MatchLineup } from './match.types'
import { streakOf } from './matchMaking.rules'

/**
 * Win chance (D-2026-11-27-02): each pair's chance to win a match, shown to the Queue Master only
 * and used by Generate matches' Even game. The mockup's wcBase / wcRating / wcCurve / wcRead /
 * wcUpset. Each player gets a form rating in level steps; a team is the average of its players;
 * win chance = 1 ÷ (1 + 10^((opponents − own team) ÷ 2)), the awards curve, kept between 5% and 95%.
 */

export type WinChance = {
  /** Team A's percent, a whole number; `a + b` is always 100 */
  a: number
  b: number
  /** The stronger pair, or null for an even game (45% to 55%) */
  favored: 'A' | 'B' | null
  /** The stronger pair is Favored: 65% or more */
  strong: boolean
}

type FormPlayer = Pick<SessionPlayer, 'id' | 'level' | 'handicapSpots' | 'form'>

const clamp = (n: number, limit: number) => Math.max(-limit, Math.min(limit, n))
/** A player who left the roster, or one with no level, counts as a mid level. */
const MID_LEVEL = 4
const winnerOf = (m: Partial<Pick<Match, 'decision'>>) =>
  m.decision?.kind === 'completed' ? m.decision.winningTeam : null

export type WinChanceRow = {
  /** Fixed key for tests and icons */
  key:
    | 'level'
    | 'club_win_rate'
    | 'best_day'
    | 'leaderboard_place'
    | 'leaderboard_trend'
    | 'tonight'
    | 'upsets'
    | 'in_row'
    | 'handicap'
  label: string
  detail: string
  /** In level steps, signed */
  value: number
}
export type WinChancePlayerBreakdown = { id: string; rows: WinChanceRow[]; rating: number }
export type WinChanceTeamBreakdown = { players: WinChancePlayerBreakdown[]; average: number }
export type WinChanceBreakdown = {
  chance: WinChance
  teamA: WinChanceTeamBreakdown
  teamB: WinChanceTeamBreakdown
  /** A completed or invalid match: lasting signals only */
  lasting: boolean
  /** The Favored pair lost (completed matches only) */
  upset: boolean
}

const sumRows = (rows: readonly WinChanceRow[]) => rows.reduce((sum, r) => sum + r.value, 0)

/**
 * The lasting rows of a player's rating: level, club win rate (no record counts as 50%), best day,
 * and club leaderboard place and direction. Nothing from tonight. The rating is the sum of the rows.
 */
function baseRows(player: FormPlayer | undefined): WinChanceRow[] {
  const level = player?.level ?? null
  const rows: WinChanceRow[] = [
    {
      key: 'level',
      label: 'Level',
      detail: level ? levelLabel(level) : 'No level · counts as mid',
      value: level ? PLAYING_LEVELS.indexOf(level) : MID_LEVEL,
    },
  ]
  const form = player?.form
  const rate = form?.clubWinRate
  rows.push(
    rate == null
      ? {
          key: 'club_win_rate',
          label: 'Club win rate',
          detail: 'No record · counts as 50%',
          value: 0,
        }
      : {
          key: 'club_win_rate',
          label: 'Club win rate',
          detail: `${Math.round(rate * 100)}%`,
          value: clamp((rate - 0.5) * 2, 1),
        },
  )
  if (!form) return rows
  if (form.bestDay)
    rows.push({
      key: 'best_day',
      label: 'Best day',
      detail: 'Plays best on this weekday',
      value: 0.25,
    })
  if (form.place)
    rows.push({
      key: 'leaderboard_place',
      label: 'Club leaderboard',
      detail: form.place > 0 ? 'Top quarter' : 'Bottom quarter',
      value: 0.25 * form.place,
    })
  if (form.trend)
    rows.push({
      key: 'leaderboard_trend',
      label: 'Leaderboard direction',
      detail: form.trend > 0 ? 'Rising' : 'Falling',
      value: 0.25 * form.trend,
    })
  return rows
}

/** The lasting part of a player's rating. Nothing from tonight. */
export const baseRating = (player: FormPlayer | undefined) => sumRows(baseRows(player))

function read(chanceA: number): WinChance {
  const top = Math.round(Math.max(chanceA, 1 - chanceA) * 100)
  const a = Math.round(chanceA * 100)
  return {
    a,
    b: 100 - a,
    favored: top <= 55 ? null : chanceA > 0.5 ? 'A' : 'B',
    strong: top >= 65,
  }
}

const averageOf = (ratings: readonly number[]) =>
  ratings.reduce((sum, r) => sum + r, 0) / Math.max(1, ratings.length)

function curve(averageA: number, averageB: number) {
  const chance = 1 / (1 + 10 ** ((averageB - averageA) / 2))
  return Math.max(0.05, Math.min(0.95, chance))
}

type Lineup = MatchLineup & Partial<Pick<Match, 'state' | 'decision'>>
type Roster = ReadonlyMap<string, FormPlayer>
const rosterOf = (players: readonly FormPlayer[]): Roster => new Map(players.map((p) => [p.id, p]))

/** A finished match is read from the lasting signals only, so its Upset mark never moves later. */
const lastingChance = (lineup: MatchLineup, roster: Roster) =>
  read(
    curve(
      averageOf(lineup.teamA.map((id) => baseRating(roster.get(id)))),
      averageOf(lineup.teamB.map((id) => baseRating(roster.get(id)))),
    ),
  )

/** Upset: a completed match that the Favored pair (65% or more) lost. */
function upsetIn(m: Lineup, roster: Roster) {
  const winner = winnerOf(m)
  if (m.state !== 'completed' || !winner) return false
  const chance = lastingChance(m, roster)
  return chance.strong && chance.favored !== winner
}

/**
 * The form rows tonight: the lasting rows, plus 0.25 × (wins − losses) tonight (±1), plus 0.25 per
 * Upset win and minus 0.25 per Upset loss tonight (±0.5), minus 0.25 per game in a row before this
 * match (2 at most), minus 0.5 with a handicap tonight. `playing`: the match being read is On court
 * or Playing, so it is not one of the games before it.
 */
function tonightRows(
  player: FormPlayer | undefined,
  id: string,
  matches: readonly Match[],
  roster: Roster,
  playing: boolean,
): WinChanceRow[] {
  const rows = baseRows(player)
  let wins = 0,
    losses = 0,
    upsetWins = 0,
    upsetLosses = 0
  for (const m of matches) {
    const winner = winnerOf(m)
    if (!winner) continue
    const side = countedTeam(m, id)
    if (!side) continue
    if (side === winner) wins += 1
    else losses += 1
    if (upsetIn(m, roster)) {
      if (side === winner) upsetWins += 1
      else upsetLosses += 1
    }
  }
  const tonight = clamp(0.25 * (wins - losses), 1)
  if (tonight !== 0)
    rows.push({
      key: 'tonight',
      label: 'Tonight',
      detail: `${wins} won · ${losses} lost`,
      value: tonight,
    })
  const upsets = clamp(0.25 * upsetWins - 0.25 * upsetLosses, 0.5)
  if (upsets !== 0)
    rows.push({
      key: 'upsets',
      label: 'Upsets tonight',
      detail: [
        upsetWins > 0 ? `${upsetWins} upset win${upsetWins === 1 ? '' : 's'}` : null,
        upsetLosses > 0 ? `${upsetLosses} upset loss${upsetLosses === 1 ? '' : 'es'}` : null,
      ]
        .filter(Boolean)
        .join(' · '),
      value: upsets,
    })
  const streak = Math.max(0, streakOf(id, matches) - (playing ? 1 : 0))
  const inRow = Math.min(2, streak)
  if (inRow > 0)
    rows.push({
      key: 'in_row',
      label: 'Games in a row',
      detail: `${streak} before this match`,
      value: -0.25 * inRow,
    })
  const spots = handicapSpotsOf(player?.handicapSpots)
  if (player?.handicapSpots?.length)
    rows.push({
      key: 'handicap',
      label: 'Handicap tonight',
      detail: spots.map((s) => handicapLabel(s).toLowerCase()).join(', '),
      value: -0.5,
    })
  return rows
}

/** A player's form rating before a waiting match or a draft (Generate matches' Even game). */
export function formRating(
  player: FormPlayer,
  players: readonly FormPlayer[],
  matches: readonly Match[],
) {
  return sumRows(tonightRows(player, player.id, matches, rosterOf(players), false))
}

/**
 * Each pair's win chance for one match, with the rows behind every player's rating. A waiting
 * match, a draft, and a match On court or Playing use tonight's form; a completed or invalid match
 * uses the lasting signals only. The chance is read from these same rows.
 */
export function winChanceBreakdown(
  match: Lineup,
  players: readonly FormPlayer[],
  matches: readonly Match[],
): WinChanceBreakdown {
  const roster = rosterOf(players)
  const lasting = match.state === 'completed' || match.state === 'invalid'
  const playing = match.state === 'on_court' || match.state === 'active'
  const team = (ids: readonly string[]): WinChanceTeamBreakdown => {
    const list = ids.map((id) => {
      const rows = lasting
        ? baseRows(roster.get(id))
        : tonightRows(roster.get(id), id, matches, roster, playing)
      return { id, rows, rating: sumRows(rows) }
    })
    return { players: list, average: averageOf(list.map((p) => p.rating)) }
  }
  const teamA = team(match.teamA)
  const teamB = team(match.teamB)
  return {
    chance: read(curve(teamA.average, teamB.average)),
    teamA,
    teamB,
    lasting,
    upset: upsetIn(match, roster),
  }
}

/** Each pair's win chance for one match (see `winChanceBreakdown`). */
export const winChance = (
  match: MatchLineup & { state?: Match['state'] },
  players: readonly FormPlayer[],
  matches: readonly Match[],
): WinChance => winChanceBreakdown(match, players, matches).chance

/**
 * A player's lasting signals from their finalized sessions at this club, one row per session with
 * its weekday (Sunday 0, Manila time). Win rate needs 10 decided games; the best day is the weekday
 * with the highest win rate and at least 3 games, as in the Player app's Weekly performance.
 * Leaderboard place and direction stay 0 until rank calculation is real.
 */
export function formFromHistory(
  sessions: readonly { weekday: number; wins: number; losses: number }[],
  tonightWeekday: number,
): PlayerForm {
  const days = Array.from({ length: 7 }, () => ({ wins: 0, losses: 0 }))
  let wins = 0,
    losses = 0
  for (const s of sessions) {
    wins += s.wins
    losses += s.losses
    const day = days[s.weekday]
    if (day) {
      day.wins += s.wins
      day.losses += s.losses
    }
  }
  let best = -1,
    bestRate = -1
  days.forEach((d, i) => {
    const n = d.wins + d.losses
    if (n >= 3 && d.wins / n > bestRate) {
      best = i
      bestRate = d.wins / n
    }
  })
  const games = wins + losses
  return {
    clubWinRate: games >= 10 ? wins / games : null,
    bestDay: best === tonightWeekday,
    place: 0,
    trend: 0,
  }
}

/**
 * Mock mode only: sample signals made from the saved player's id, the mockup's wcBase (the mock
 * store keeps no long club history). A guest has no record.
 */
export function sampleForm(id: string, tonightWeekday: number): PlayerForm {
  let h = 7
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return {
    clubWinRate: 0.35 + (h % 31) / 100,
    bestDay: (h >>> 5) % 7 === tonightWeekday,
    place: ([1, 0, 0, -1] as const)[(h >>> 8) % 4] ?? 0,
    trend: ([-1, 0, 1] as const)[(h >>> 10) % 3] ?? 0,
  }
}

/** Upset: the Favored pair lost this completed match. */
export const isUpset = (match: Match, players: readonly FormPlayer[]) =>
  upsetIn(match, rosterOf(players))
