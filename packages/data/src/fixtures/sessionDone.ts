import { computeStandings } from '../match/match.rules'
import type { Match } from '../match/match.types'
import { createConsoleFixtures } from './consoleSessions'

/** One player under the session minimum, as the Session done sheet lists them. */
export type SessionDoneShortfall = {
  clubPlayerId: string
  name: string
  completedGames: number
}

/** A game still in play, named by its court label(s): "Court 1" or "Court 1 + Court 2". */
export type SessionDoneActiveGame = { courtLabels: string }

/** The values the Session done sheet shows for one scenario. */
export type SessionDoneScenario = {
  sessionTitle: string
  startedAt: number
  endsAt: number
  gamesRecorded: number
  participants: number
  pendingChanges: number
  activeGames: SessionDoneActiveGame[]
  unplayedWaiting: number
  belowMinimum: SessionDoneShortfall[]
  minimum: number
}

/**
 * Story-only scenarios for the Session done sheet, built on the tonight console fixture: a clean
 * review (everyone met the minimum, nothing in play or waiting), games still in play on two
 * courts, unplayed waiting matches with shortfalls, and the shortfall list with long names. The
 * normal store starts with no matches.
 */
export function createSessionDoneFixtures(now = Date.now()) {
  const fixture = createConsoleFixtures(now)
  const { session, roster, courts, matches } = fixture
  const startedAt = session.startedAt ?? now - 3600000
  const endsAt = session.scheduledEndAt
  const label = (id: string) => courts.find((c) => c.id === id)?.label ?? id
  const courtLabels = (m: Match) => m.courtIds.map(label).join(' + ')

  const present = roster.filter((p) => p.present)
  const games = new Map(computeStandings(roster, matches).map((r) => [r.playerId, r.games]))
  const gamesOf = (playerId: string) => games.get(playerId) ?? 0
  const shortfalls = (minimum: number): SessionDoneShortfall[] =>
    present
      .filter((p) => gamesOf(p.id) < minimum)
      .map((p) => ({
        clubPlayerId: p.clubPlayerId,
        name: p.nameSnapshot,
        completedGames: gamesOf(p.id),
      }))

  const gamesRecorded = matches.filter((m) => m.state === 'completed').length
  const waiting = matches.filter((m) => m.state === 'waiting').length
  const active = matches.filter((m) => m.state === 'active')
  const secondCourt = courts[2]
  if (!secondCourt) throw new Error('Missing court fixture.')

  const base = {
    sessionTitle: session.title,
    startedAt,
    endsAt,
    gamesRecorded,
    participants: roster.length,
    pendingChanges: 0,
    minimum: session.minimumGames,
  }

  /** Everyone who played met a minimum of one game; nothing in play or waiting. */
  const clean: SessionDoneScenario = {
    ...base,
    participants: present.filter((p) => gamesOf(p.id) >= 1).length,
    activeGames: [],
    unplayedWaiting: 0,
    belowMinimum: [],
    minimum: 1,
  }

  /** The console fixture's live game plus a second one on Court 3. */
  const inPlay: SessionDoneScenario = {
    ...base,
    activeGames: [
      ...active.map((m) => ({ courtLabels: courtLabels(m) })),
      { courtLabels: secondCourt.label },
    ],
    unplayedWaiting: waiting,
    belowMinimum: shortfalls(session.minimumGames),
  }

  /** Nothing in play; the waiting matches were never played and most players are under minimum. */
  const shortfallsOnly: SessionDoneScenario = {
    ...base,
    activeGames: [],
    unplayedWaiting: waiting,
    belowMinimum: shortfalls(session.minimumGames),
  }

  /** The shortfall list with long names that must wrap at 375 px. */
  const longNames: SessionDoneScenario = {
    ...shortfallsOnly,
    belowMinimum: shortfallsOnly.belowMinimum.map((p, i) =>
      i === 0
        ? { ...p, name: 'Maria Consolacion Villanueva-Bautista' }
        : i === 1
          ? { ...p, name: 'Bartholomew Dimaculangan' }
          : p,
    ),
  }

  return { clean, inPlay, shortfalls: shortfallsOnly, longNames }
}

export const sessionDoneFixtures = createSessionDoneFixtures()
