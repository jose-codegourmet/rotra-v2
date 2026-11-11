import { getSession } from '../auth/fetchers'
import { readMockState } from '../mock/store'
import { playerProjection } from '../player/projection'
import { isAlwaysPrivatePlayer, isPrivatePlayer } from '../player/visibility'
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
  const viewerId = (await getSession('player'))?.account.id ?? null
  return {
    entries: entries.slice(offset, offset + limit).map((e) => maskedEntry(e, viewerId)),
    total: entries.length,
  }
}
/**
 * D-2026-11-12-01: a visitor sees a private player's name masked with no picture; an always-private
 * player is masked for everyone but themselves, keeps their picture and position, and hides their
 * level.
 */
function maskedEntry<T extends { playerId: string; fullName: string }>(
  entry: T,
  viewerId: string | null,
) {
  if (entry.playerId === viewerId) return { ...entry, masked: false as const }
  if (isAlwaysPrivatePlayer(entry.playerId))
    return {
      ...entry,
      fullName: maskPublicName(entry.fullName),
      nickname: null,
      masked: true as const,
      levelHidden: true as const,
    }
  if (!viewerId && isPrivatePlayer(entry.playerId))
    return {
      ...entry,
      fullName: maskPublicName(entry.fullName),
      nickname: null,
      pictureUrl: null,
      masked: true as const,
    }
  return { ...entry, masked: false as const }
}
export async function searchLeaderboard(query: string, signal?: AbortSignal) {
  if (isRealDataMode()) return realSearchLeaderboard(query, signal)
  await playerRequest(signal)
  const q = query.trim().toLowerCase()
  const viewerId = (await getSession('player'))?.account.id ?? null
  // Masked names never match a search: private ones for a visitor, always private for everyone else.
  const hits = playerProjection().entries.filter(
    (e) =>
      (e.playerId === viewerId ||
        (!isAlwaysPrivatePlayer(e.playerId) && (viewerId || !isPrivatePlayer(e.playerId)))) &&
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
