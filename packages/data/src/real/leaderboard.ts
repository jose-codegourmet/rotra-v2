import type {
  LeaderboardPage,
  LeaderboardPeriod,
  LeaderboardRow,
  MyPeriodPosition,
} from '../leaderboard/leaderboard.types'
import { realRequest } from './client'

export type RealLeaderboardEntry = LeaderboardRow

export function realGetLeaderboardPage(
  { offset, limit, period }: { offset: number; limit: number; period?: LeaderboardPeriod },
  signal?: AbortSignal,
) {
  return realRequest<LeaderboardPage>(
    `/api/leaderboard?offset=${offset}&limit=${limit}${period ? `&period=${period}` : ''}`,
    { signal },
  )
}

/** The club's leaderboard; the Player and Queue apps both serve `/api/clubs/[clubId]/leaderboard`. */
export function realGetClubLeaderboardPage(
  {
    clubId,
    offset,
    limit,
    period,
  }: { clubId: string; offset: number; limit: number; period: LeaderboardPeriod },
  signal?: AbortSignal,
) {
  return realRequest<LeaderboardPage>(
    `/api/clubs/${encodeURIComponent(clubId)}/leaderboard?offset=${offset}&limit=${limit}&period=${period}`,
    { signal },
  )
}

export function realSearchLeaderboard(
  query: string,
  signal?: AbortSignal,
  period?: LeaderboardPeriod,
) {
  return realRequest<{ hits: RealLeaderboardEntry[]; total: number }>(
    `/api/leaderboard/search?q=${encodeURIComponent(query.trim())}${period ? `&period=${period}` : ''}`,
    { signal },
  )
}

export async function realGetMyPeriodPosition(period: LeaderboardPeriod, signal?: AbortSignal) {
  const { standing } = await realRequest<{ standing: MyPeriodPosition | null }>(
    `/api/leaderboard/me?period=${period}`,
    { signal },
  )
  return standing
}

export async function realGetMyLeaderboardPosition(signal?: AbortSignal) {
  const { position } = await realRequest<{ position: number | null }>('/api/leaderboard/me', {
    signal,
  })
  return position
}
