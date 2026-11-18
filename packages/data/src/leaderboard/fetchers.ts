import { getSession } from '../auth/fetchers'
import { readMockState } from '../mock/store'
import {
  realGetLeaderboardPage,
  realGetMyLeaderboardPosition,
  realGetMyPeriodPosition,
  realSearchLeaderboard,
} from '../real/leaderboard'
import { isRealDataMode } from '../real/mode'
import { leaderboardPeriodStart, ownPeriodPosition } from './leaderboard.rules'
import type { LeaderboardPage, LeaderboardPeriod, MyPeriodPosition } from './leaderboard.types'
import { mockLeaderboard } from './projection'
import { playerRequest } from './request'

/** Match the cache's audience to the actual session, including during sign-in and sign-out. */
async function mockViewer(viewerScope?: string | null) {
  if (viewerScope === null) return null
  const viewerId = (await getSession('player'))?.account.id ?? null
  return viewerScope === undefined || viewerId === viewerScope ? viewerId : null
}

export async function getLeaderboardPage(
  input: { offset: number; limit?: 25; period?: LeaderboardPeriod },
  signal?: AbortSignal,
  viewerScope?: string | null,
): Promise<LeaderboardPage> {
  const { offset, limit = 25, period = 'year' } = input
  if (isRealDataMode()) return realGetLeaderboardPage({ ...input, limit }, signal)
  await playerRequest(signal)
  const board = mockLeaderboard(readMockState())
  const entries = board.entries(period, await mockViewer(viewerScope))
  return {
    entries: entries.slice(offset, offset + limit),
    total: entries.length,
    periodStart: new Date(leaderboardPeriodStart(period, board.now)).toISOString(),
  }
}

/** Search only public rows in the selected top 50. A masked entry never matches even its initials. */
export async function searchLeaderboard(
  query: string,
  signal?: AbortSignal,
  period?: LeaderboardPeriod,
  viewerScope?: string | null,
) {
  if (isRealDataMode()) return realSearchLeaderboard(query, signal, period)
  await playerRequest(signal)
  const q = query.trim().toLowerCase()
  const viewerId = await mockViewer(viewerScope)
  const entries = mockLeaderboard(readMockState()).entries(period ?? 'year', viewerId)
  const hits = entries.filter(
    (e) =>
      q &&
      !e.masked &&
      (e.fullName.toLowerCase().includes(q) || e.nickname?.toLowerCase().includes(q)),
  )
  return { hits, total: hits.length }
}

export async function getMyPeriodPosition(
  period: LeaderboardPeriod,
  signal?: AbortSignal,
  playerId?: string,
): Promise<MyPeriodPosition | null> {
  if (isRealDataMode()) return realGetMyPeriodPosition(period, signal)
  await playerRequest(signal)
  const viewerId = await mockViewer(playerId)
  if (!viewerId) return null
  return ownPeriodPosition(mockLeaderboard(readMockState()).standings(period), viewerId)
}

/** Existing consumers use the public annual place; only the owner-specific period read includes the cutoff. */
export async function getMyLeaderboardPosition(signal?: AbortSignal) {
  if (isRealDataMode()) return realGetMyLeaderboardPosition(signal)
  const own = await getMyPeriodPosition('year', signal)
  return own && own.cutoffWins === undefined ? own.position : null
}
