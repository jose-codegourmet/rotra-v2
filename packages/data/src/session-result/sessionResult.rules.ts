import type { ClubPlayer } from '../club-player/clubPlayer.types'
import { allPlayers, computeStandings, countsFor } from '../match/match.rules'
import type { Match } from '../match/match.types'
import { PLAYING_LEVELS } from '../player/player.types'
import type { SessionPlayer } from '../session-roster/sessionRoster.types'
import type {
  AwardRow,
  ExportFormat,
  ExportFrame,
  ExportSelection,
  ImprovementRow,
  PlayerAwardHistory,
  SessionAwards,
  SessionResultSnapshot,
  StandingRow,
} from './sessionResult.types'

/** Standings order is the live leaderboard's (match.rules computeStandings); this only numbers the rows. */
export function sessionStandings(roster: SessionPlayer[], matches: Match[]): StandingRow[] {
  return computeStandings(roster, matches).map((r, i) => ({
    position: i + 1,
    sessionPlayerId: r.playerId,
    clubPlayerId: roster.find((p) => p.id === r.playerId)?.clubPlayerId ?? r.playerId,
    name: r.name,
    wins: r.wins,
    losses: r.losses,
    games: r.games,
  }))
}

/** Prototype reference: a player without a locked level is treated as Intermediate Mid (index 4). */
const DEFAULT_LEVEL_INDEX = 4
/** Level index 0–8 of the nine-level list (Beginner Low = 0 … Advanced High = 8). */
export function levelIndex(level: SessionPlayer['level']): number {
  const i = level ? PLAYING_LEVELS.indexOf(level) : -1
  return i < 0 ? DEFAULT_LEVEL_INDEX : i
}
export const MVP_MIN_GAMES = 2
export const AWARD_MIN_PRIOR_SESSIONS = 5
export const MOST_IMPROVED_MIN_DELTA = 0.15
export const OFF_DAY_MAX_DELTA = -0.3

/**
 * Prototype reference award formula (open decision "Final rank/pairing/award formulas",
 * docs/business_logic/product/open-decisions.md), ported from rotra-queue.html awards():
 * - expected win chance per counted game = 1 / (1 + 10^((opponents' avg level − own team's avg level) / 2))
 * - performance score = Σ (1 if won else 0) − expected; MVP is the highest score over ≥ 2 counted games
 * - players with ≥ 5 prior club sessions and a baseline win rate compare tonight's rate against it:
 *   Most Improved is the largest rise ≥ +0.15; Off Day lists every drop ≤ −0.30 (biggest drop first)
 * Partial (substituted) and invalid games count for no one. No baseline means no Most Improved or Off
 * Day entry for that player; the weakest player is never listed just to fill Off Day.
 */
export function computeAwards(
  matches: Match[],
  roster: SessionPlayer[],
  history: PlayerAwardHistory[],
  players: Pick<ClubPlayer, 'id' | 'playerId'>[] = [],
): SessionAwards {
  const done = matches.filter((m) => m.state === 'completed')
  const level = (id: string) => levelIndex(roster.find((p) => p.id === id)?.level ?? null)
  const avg = (ids: string[]) =>
    ids.length ? ids.reduce((t, id) => t + level(id), 0) / ids.length : DEFAULT_LEVEL_INDEX
  const perf: { row: AwardRow; wins: number }[] = roster
    .map((p) => {
      let score = 0,
        games = 0,
        wins = 0
      for (const m of done) {
        if (!countsFor(m, p.id) || !m.decision?.winningTeam || !allPlayers(m).includes(p.id))
          continue
        const onA = m.teamA.includes(p.id),
          mine = avg(onA ? m.teamA : m.teamB),
          opp = avg(onA ? m.teamB : m.teamA),
          expected = 1 / (1 + 10 ** ((opp - mine) / 2)),
          won = (m.decision.winningTeam === 'A') === onA
        score += (won ? 1 : 0) - expected
        games += 1
        if (won) wins += 1
      }
      return {
        row: {
          sessionPlayerId: p.id,
          clubPlayerId: p.clubPlayerId,
          playerId: players.find((c) => c.id === p.clubPlayerId)?.playerId ?? null,
          name: p.nameSnapshot,
          games,
          score,
        },
        wins,
      }
    })
    .filter((x) => x.row.games >= MVP_MIN_GAMES)
  const mvp = [...perf].sort((a, b) => b.row.score - a.row.score)[0]?.row ?? null
  const hist: ImprovementRow[] = perf.flatMap(({ row, wins }) => {
    const h = history.find((x) => x.clubPlayerId === row.clubPlayerId)
    if (!h || h.priorSessions < AWARD_MIN_PRIOR_SESSIONS || h.baselineWinRate == null) return []
    const winRate = wins / row.games
    return [
      {
        ...row,
        priorSessions: h.priorSessions,
        baselineWinRate: h.baselineWinRate,
        winRate,
        delta: winRate - h.baselineWinRate,
      },
    ]
  })
  const mostImproved =
    hist.filter((x) => x.delta >= MOST_IMPROVED_MIN_DELTA).sort((a, b) => b.delta - a.delta)[0] ??
    null
  const offDay = hist.filter((x) => x.delta <= OFF_DAY_MAX_DELTA).sort((a, b) => a.delta - b.delta)
  return { mvp, mostImproved, offDay }
}

/** Builds the private snapshot the finalization `slides` stage stores. */
export function createResultSnapshot(input: {
  sessionId: string
  roster: SessionPlayer[]
  matches: Match[]
  history: PlayerAwardHistory[]
  players?: Pick<ClubPlayer, 'id' | 'playerId'>[]
  generatedAt: number
}): SessionResultSnapshot {
  const roster = input.roster.filter((p) => p.sessionId === input.sessionId),
    matches = input.matches.filter((m) => m.sessionId === input.sessionId)
  return {
    sessionId: input.sessionId,
    standings: sessionStandings(roster, matches),
    awards: computeAwards(matches, roster, input.history, input.players ?? []),
    calculationVersion: 'prototype-reference',
    priorSessionCounts: Object.fromEntries(
      roster.map((p) => [
        p.clubPlayerId,
        input.history.find((h) => h.clubPlayerId === p.clubPlayerId)?.priorSessions ?? 0,
      ]),
    ),
    generatedAt: input.generatedAt,
  }
}

export const ROWS_PER_FRAME: Record<ExportFormat, number> = { story: 14, feed: 10 }
/**
 * Long standings continue onto extra images so every name stays readable: 14 rows per Story image,
 * 10 per Feed image. Frames are titled "Standings 1", "Standings 2" … only when there is more than one;
 * an empty standings list still yields one "Standings" frame, as the prototype's export sheet does.
 */
export function paginateStandings<T>(
  rows: readonly T[],
  format: ExportFormat,
): { title: string; rows: T[] }[] {
  const per = ROWS_PER_FRAME[format],
    count = Math.max(1, Math.ceil(rows.length / per))
  return Array.from({ length: count }, (_, i) => ({
    title: count > 1 ? `Standings ${i + 1}` : 'Standings',
    rows: rows.slice(i * per, i * per + per),
  }))
}
/** Download images frames in order: standings pages, Awards, then Off Day only when explicitly included. */
export function buildExportFrames(
  snapshot: Pick<SessionResultSnapshot, 'standings' | 'awards'>,
  selection: ExportSelection,
  format: ExportFormat,
): ExportFrame[] {
  const frames: ExportFrame[] = []
  if (selection.slides.includes('standings'))
    frames.push(
      ...paginateStandings(
        snapshot.standings.map((r) => r.name),
        format,
      ),
    )
  if (selection.slides.includes('awards'))
    frames.push({
      title: 'Awards',
      rows: [
        snapshot.awards.mvp ? `MVP · ${snapshot.awards.mvp.name}` : 'MVP · none',
        ...(snapshot.awards.mostImproved
          ? [`Most Improved · ${snapshot.awards.mostImproved.name}`]
          : []),
      ],
    })
  if (selection.includeOffDay)
    frames.push({ title: 'Off Day', rows: snapshot.awards.offDay.map((x) => x.name) })
  return frames
}
