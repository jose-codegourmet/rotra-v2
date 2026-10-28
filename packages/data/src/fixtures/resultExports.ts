import { paginateStandings } from '../session-result/sessionResult.rules'
import type { ExportFormat } from '../session-result/sessionResult.types'
import { clubs } from './clubs'
import { clubPlayers, leaderboardPlayers } from './players'
import { sessionHistoryFixtures } from './sessionHistory'

/** One image of a Download images export: its slide title and the lines it lists. */
export type ResultExportFrameFixture = {
  title: string
  rows: string[]
}

/**
 * Story-only data for the Download images sheet (Q-EXPORT) and Publish results (Q-PUBLISH): the
 * demo club, a 30-name standings list (the 20 saved club players plus ten other leaderboard players),
 * the awards lines and three Off Day names. Frames are paginated by the Q08 session-result rule
 * (14 rows per Story image, 10 per Feed).
 */
const club = clubs[0]
if (!club) throw new Error('Missing club fixture.')

const thursday = sessionHistoryFixtures.histories[0]
if (!thursday) throw new Error('Missing session history fixture.')

const clubPlayerIds = new Set(clubPlayers.map((p) => p.playerId))
const standingsNames30: string[] = [
  ...clubPlayers.map((p) => p.fullName),
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

const paginate = (rows: string[], format: ExportFormat): ResultExportFrameFixture[] =>
  paginateStandings(rows, format)

export const resultExportFixtures = {
  clubName: club.name,
  session: thursday.session,
  /** Counted games on the Thursday history session (one match is invalid) */
  gameCount: thursday.matches.filter((m) => m.state === 'completed').length,
  standingsCount: thursday.roster.length,
  standingsNames30,
  awardsRows,
  offDayNames,
  /** 30 names as Story images: three standings frames of 14, 14 and 2, then Awards */
  storyFrames30: [...paginate(standingsNames30, 'story'), { title: 'Awards', rows: awardsRows }],
  /** 30 names as Feed images: three standings frames of 10, then Awards */
  feedFrames30: [...paginate(standingsNames30, 'feed'), { title: 'Awards', rows: awardsRows }],
  awardsOnlyFrames: [{ title: 'Awards', rows: awardsRows }],
  /** Standings (14 names, one Story frame), Awards and the explicitly included Off Day frame */
  withOffDayFrames: [
    ...paginate(standingsNames30.slice(0, 14), 'story'),
    { title: 'Awards', rows: awardsRows },
    { title: 'Off Day', rows: offDayNames },
  ],
} satisfies {
  clubName: string
  session: typeof thursday.session
  gameCount: number
  standingsCount: number
  standingsNames30: string[]
  awardsRows: string[]
  offDayNames: string[]
  storyFrames30: ResultExportFrameFixture[]
  feedFrames30: ResultExportFrameFixture[]
  awardsOnlyFrames: ResultExportFrameFixture[]
  withOffDayFrames: ResultExportFrameFixture[]
}
