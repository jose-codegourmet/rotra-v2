import { computeStandings } from '../match/match.rules'
import { clubs } from './clubs'
import { createSessionHistoryFixtures } from './sessionHistory'

/** One standings row as the result slides draw it (Q-STANDINGS-SLIDE). */
export type ResultSlideStandingRow = {
  position: number
  name: string
  wins: number
  losses: number
  games: number
}

/** The frame every result slide shares: club, session line and venue. */
export type ResultSlideFrameFixture = {
  club: { name: string; logoUrl?: string | null; initials: string }
  sessionLine: string
  venue: string
}

const fmtDate = (t: number) =>
  new Date(t).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })

/**
 * Story-only data for the three result slides, taken from the h1 Thursday Open Play history
 * (18 players, three courts). Standings use the same maths as the live leaderboard; the award and
 * Off Day rows are the prototype's sample outcomes for that night, not computed (the award maths is
 * still open), so the slides show what each state looks like.
 */
export function createResultSlideFixtures(now = Date.now()) {
  const history = createSessionHistoryFixtures(now).histories[0]
  const club = clubs[0]
  if (!history || !club) throw new Error('Missing session history or club fixture.')
  const frame: ResultSlideFrameFixture = {
    club: { name: club.name, logoUrl: null, initials: club.initials },
    sessionLine: `${history.session.title} · ${fmtDate(history.session.scheduledStartAt)}`,
    venue: history.session.venueName,
  }
  const standings: ResultSlideStandingRow[] = computeStandings(history.roster, history.matches).map(
    (r, i) => ({
      position: i + 1,
      name: r.name,
      wins: r.wins,
      losses: r.losses,
      games: r.games,
    }),
  )
  const nameAt = (i: number) => {
    const p = history.roster[i]
    if (!p) throw new Error('Missing roster fixture.')
    return p.nameSnapshot
  }
  return {
    frame,
    standings,
    mvp: { name: standings[0]?.name ?? nameAt(0) },
    mostImproved: { name: nameAt(4), priorSessions: 6 },
    offDay: [
      { name: nameAt(9), priorSessions: 7 },
      { name: nameAt(12), priorSessions: 5 },
    ],
    longNames: {
      standings: standings.slice(0, 5).map((r, i) => ({
        ...r,
        name: i === 1 ? 'Maria Antonia Villanueva-Dela Cruz Bautista' : r.name,
      })),
      mvp: { name: 'Maria Antonia Villanueva-Dela Cruz Bautista' },
      mostImproved: { name: 'Juan Jose Reyes-Santos Magbanua Jr.', priorSessions: 12 },
      offDay: [{ name: 'Maria Antonia Villanueva-Dela Cruz Bautista', priorSessions: 11 }],
      frame: {
        ...frame,
        club: {
          ...frame.club,
          name: 'Lahug Smash and Shuttle Badminton Association of Cebu',
          initials: 'LS',
        },
        sessionLine: `Thursday Open Play and Monthly Club Championship Qualifiers · ${fmtDate(history.session.scheduledStartAt)}`,
        venue: 'Cebu City Sports Complex Multi-Purpose Badminton Hall, Osmeña Blvd',
      },
    },
  }
}

export const resultSlideFixtures = createResultSlideFixtures()
