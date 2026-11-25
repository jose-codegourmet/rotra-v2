import { clubs } from './clubs'
import { clubPlayers, leaderboardPlayers } from './players'
import { sessionHistoryFixtures } from './sessionHistory'

/** One standings row of the export sample (the fields StandingsSlide draws). */
export type ResultExportStandingRow = {
  id: string
  position: number
  name: string
  wins: number
  losses: number
  games: number
}

/**
 * Story-only data for the Download images sheet (Q-EXPORT) and Publish results (Q-PUBLISH): the
 * demo club, a 30-name standings list (the first 20 saved club players plus ten other leaderboard
 * players; Kenji, Kenjie and Atty Steph stay off this sample so the 14/14/2 frame split holds),
 * the awards lines and three Off Day names. `standingsRows30` gives those 30 names positions with
 * a 2-way, a 3-way and a 6-way tie, so the export rule (14 rows per Story image, 9 per Feed; a
 * position is never split) has shared positions to page.
 */
const club = clubs[0]
if (!club) throw new Error('Missing club fixture.')

const thursday = sessionHistoryFixtures.histories[0]
if (!thursday) throw new Error('Missing session history fixture.')

const clubPlayerIds = new Set(clubPlayers.map((p) => p.playerId))
const standingsNames30: string[] = [
  ...clubPlayers.slice(0, 20).map((p) => p.fullName),
  ...leaderboardPlayers
    .filter((p) => !clubPlayerIds.has(p.id))
    .slice(0, 10)
    .map((p) => p.fullName),
]

const offDayNames = clubPlayers.slice(2, 5).map((p) => p.nickname ?? p.fullName)

const awardsRows = [
  `MVP · ${clubPlayers[0]?.fullName}`,
  `Most Improved · ${clubPlayers[3]?.fullName}`,
]

/** Positions for the 30 names: ties of 2 (position 2), 3 (position 5) and 6 (position 9). */
const TIES: Record<number, number> = { 2: 2, 5: 3, 9: 6 }
const standingsRows30: ResultExportStandingRow[] = (() => {
  const rows: ResultExportStandingRow[] = []
  let position = 0
  while (rows.length < standingsNames30.length) {
    position++
    const size = Math.min(TIES[position] ?? 1, standingsNames30.length - rows.length)
    for (let k = 0; k < size; k++) {
      const name = standingsNames30[rows.length] as string
      const wins = Math.max(0, 8 - position)
      rows.push({
        id: `row-${rows.length + 1}`,
        position,
        name,
        wins,
        losses: position,
        games: wins + position,
      })
    }
  }
  return rows
})()

export const resultExportFixtures = {
  clubName: club.name,
  session: thursday.session,
  /** Counted games on the Thursday history session (one match is invalid) */
  gameCount: thursday.matches.filter((m) => m.state === 'completed').length,
  standingsCount: thursday.roster.length,
  standingsNames30,
  awardsRows,
  offDayNames,
  standingsRows30,
} satisfies {
  clubName: string
  session: typeof thursday.session
  gameCount: number
  standingsCount: number
  standingsNames30: string[]
  awardsRows: string[]
  offDayNames: string[]
  standingsRows30: ResultExportStandingRow[]
}
