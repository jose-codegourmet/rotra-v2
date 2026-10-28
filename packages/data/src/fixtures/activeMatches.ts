import { countedGames, courtNames, substitutionCandidates, waitMinutes } from '../match/match.rules'
import type { Match, MatchFormat } from '../match/match.types'
import type { PlayingLevel } from '../player/player.types'
import { shortName } from '../session-roster/sessionRoster.rules'
import type { SessionPlayer } from '../session-roster/sessionRoster.types'
import { createConsoleFixtures } from './consoleSessions'

/** One player as the Active match sheet's lineup cards draw them. */
export type ActiveMatchPlayerFixture = {
  id: string
  name: string
  shortName: string
  level: PlayingLevel | null
  games: number
}

/** One substitution line on the Active match sheet. */
export type ActiveMatchSubstitutionFixture = {
  /** The player who came off, full name */
  outName: string
  /** The player who came on, full name */
  inName: string
}

/** Everything Q-ACTIVE-MATCH shows for one match in play. */
export type ActiveMatchFixture = {
  matchNo: number
  /** "Court 1", or "Court 1 + Court 2" for a merged 5v5 */
  courtLabel: string
  format: MatchFormat
  startedAt: number
  /** The clock the "M min in" line is computed against */
  now: number
  minimumGames: number
  teamA: ActiveMatchPlayerFixture[]
  teamB: ActiveMatchPlayerFixture[]
  substitutions: ActiveMatchSubstitutionFixture[]
}

/** A player tile on Q-SUBSTITUTE; `team` is set for the players in the match. */
export type SubstitutionPlayerFixture = ActiveMatchPlayerFixture & { team?: 'A' | 'B' }

/** Everything Q-SUBSTITUTE shows for one match in play. */
export type SubstitutionFixture = {
  matchNo: number
  minimumGames: number
  /** Everyone in the match, Team A first, each with their team */
  inMatch: (ActiveMatchPlayerFixture & { team: 'A' | 'B' })[]
  /** Present players not in this match and not playing elsewhere, with their rest time */
  candidates: (ActiveMatchPlayerFixture & { restMinutes: number })[]
}

/**
 * Story-only facts for the in-game control sheets, built from the console fixtures: the doubles
 * match on Court 1, the merged 5v5 on both courts, the same doubles after two substitutions, and the
 * substitution picker with and without a free replacement. The normal store starts with no matches.
 */
export function createActiveMatchFixtures(now = Date.now()) {
  const scenario = createConsoleFixtures(now)
  const { session, roster, courts, matches } = scenario
  const byId = (id: string) => {
    const p = roster.find((p) => p.id === id)
    if (!p) throw new Error('Missing roster fixture.')
    return p
  }
  const card = (p: SessionPlayer): ActiveMatchPlayerFixture => ({
    id: p.id,
    name: p.nameSnapshot,
    shortName: shortName(p),
    level: p.level,
    games: countedGames(p.id, matches),
  })
  const active = (m: Match): ActiveMatchFixture => ({
    matchNo: m.matchNo,
    courtLabel: courtNames(m, courts),
    format: m.format,
    startedAt: m.startedAt ?? now,
    now,
    minimumGames: session.minimumGames,
    teamA: m.teamA.map((id) => card(byId(id))),
    teamB: m.teamB.map((id) => card(byId(id))),
    substitutions: m.substitutions.map((s) => ({
      outName: byId(s.outId).nameSnapshot,
      inName: byId(s.inId).nameSnapshot,
    })),
  })
  const playing = matches.find((m) => m.state === 'active'),
    mergedMatch = scenario.merged.matches.find((m) => m.state === 'active')
  if (!playing || !mergedMatch) throw new Error('Missing active match fixture.')

  // Match 1 after two mid-game replacements: 9 came on for 0 (Team A), 10 for 2 (Team B).
  const pid = (i: number) => {
    const p = roster[i]
    if (!p) throw new Error('Missing roster fixture.')
    return p.id
  }
  const substituted: Match = {
    ...playing,
    teamA: playing.teamA.map((id) => (id === pid(0) ? pid(9) : id)),
    teamB: playing.teamB.map((id) => (id === pid(2) ? pid(10) : id)),
    substitutions: [
      { outId: pid(0), inId: pid(9), team: 'A', at: now - 900000 },
      { outId: pid(2), inId: pid(10), team: 'B', at: now - 300000 },
    ],
  }

  const substitution = (
    m: Match,
    list: Match[],
    people: SessionPlayer[] = roster,
  ): SubstitutionFixture => ({
    matchNo: m.matchNo,
    minimumGames: session.minimumGames,
    inMatch: [
      ...m.teamA.map((id) => ({ ...card(byId(id)), team: 'A' as const })),
      ...m.teamB.map((id) => ({ ...card(byId(id)), team: 'B' as const })),
    ],
    candidates: substitutionCandidates(m, people, list).map((p) => ({
      ...card(p),
      restMinutes: waitMinutes(p, list, session.startedAt, now),
    })),
  })
  // The merged 5v5 uses ten players; everyone from index 11 on is not present, so nobody is free.
  const sub = substitution(playing, matches),
    noReplacement = substitution(
      mergedMatch,
      scenario.merged.matches,
      roster.map((p, i) => (i >= 11 ? { ...p, present: false } : p)),
    )
  const outId = sub.inMatch[0]?.id ?? null,
    inId = sub.candidates[0]?.id ?? null

  return {
    session,
    doubles: active(playing),
    merged: active(mergedMatch),
    withSubstitutions: active(substituted),
    substitution: sub,
    noReplacement,
    /** A complete choice on the pick step: the first player in the match and the first free player */
    chosen: { outId, inId },
  }
}

export const activeMatchFixtures = createActiveMatchFixtures()
