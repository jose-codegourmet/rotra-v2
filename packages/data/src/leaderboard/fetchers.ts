import { getSession } from '../auth/fetchers'
import { playerProjection } from '../player/projection'
import { playerRequest } from './request'

export async function getLeaderboardPage(
  { offset, limit = 25 }: { offset: number; limit?: 25 },
  signal?: AbortSignal,
) {
  await playerRequest(signal)
  const { entries } = playerProjection()
  return { entries: entries.slice(offset, offset + limit), total: entries.length }
}
export async function searchLeaderboard(query: string, signal?: AbortSignal) {
  await playerRequest(signal)
  const q = query.trim().toLowerCase()
  const hits = playerProjection().entries.filter(
    (e) => e.fullName.toLowerCase().includes(q) || e.nickname?.toLowerCase().includes(q),
  )
  return { hits: hits.slice(0, 50), total: hits.length }
}
export async function getMyLeaderboardPosition(signal?: AbortSignal) {
  await playerRequest(signal)
  const session = await getSession('player')
  return session ? (playerProjection().ranks[session.account.id]?.position ?? null) : null
}
