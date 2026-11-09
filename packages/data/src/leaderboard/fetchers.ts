import { getSession } from '../auth/fetchers'
import { readMockState } from '../mock/store'
import { playerProjection } from '../player/projection'
import { isPrivatePlayer } from '../player/visibility'
import { maskPublicName } from '../public-session/publicSession.rules'
import {
  realGetLeaderboardPage,
  realGetMyLeaderboardPosition,
  realSearchLeaderboard,
} from '../real/leaderboard'
import { isRealDataMode } from '../real/mode'
import { playerRequest } from './request'

export async function getLeaderboardPage(
  { offset, limit = 25 }: { offset: number; limit?: 25 },
  signal?: AbortSignal,
) {
  if (isRealDataMode()) return realGetLeaderboardPage({ offset, limit }, signal)
  await playerRequest(signal)
  const { entries } = playerProjection()
  const signedIn = !!(await getSession('player'))
  return {
    entries: entries.slice(offset, offset + limit).map((e) =>
      !signedIn && isPrivatePlayer(e.playerId)
        ? {
            ...e,
            fullName: maskPublicName(e.fullName),
            nickname: null,
            pictureUrl: null,
            masked: true,
          }
        : { ...e, masked: false },
    ),
    total: entries.length,
  }
}
export async function searchLeaderboard(query: string, signal?: AbortSignal) {
  if (isRealDataMode()) return realSearchLeaderboard(query, signal)
  await playerRequest(signal)
  const q = query.trim().toLowerCase()
  const signedIn = !!(await getSession('player'))
  const hits = playerProjection().entries.filter(
    (e) =>
      (signedIn || !isPrivatePlayer(e.playerId)) &&
      !readMockState().adminPlayerRecords[e.playerId]?.archivedAt &&
      (e.fullName.toLowerCase().includes(q) || e.nickname?.toLowerCase().includes(q)),
  )
  return { hits: hits.slice(0, 50), total: hits.length }
}
export async function getMyLeaderboardPosition(signal?: AbortSignal) {
  if (isRealDataMode()) return realGetMyLeaderboardPosition(signal)
  await playerRequest(signal)
  const session = await getSession('player')
  return session ? (playerProjection().ranks[session.account.id]?.position ?? null) : null
}
