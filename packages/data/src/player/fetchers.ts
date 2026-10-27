import { playerRequest } from '../leaderboard/request'
import { playerProjection } from './projection'
import type { PlayerRank, PlayerSessionRecord } from './player.types'

export async function getPlayerRank(playerId: string, signal?: AbortSignal): Promise<PlayerRank | null> {
  await playerRequest(signal)
  return playerProjection().ranks[playerId] ?? null
}
export async function getPlayerGames(playerId: string, signal?: AbortSignal): Promise<PlayerSessionRecord[]> {
  await playerRequest(signal)
  return playerProjection().games[playerId] ?? []
}
export async function findPlayerByRtrId(rtrId: string, signal?: AbortSignal): Promise<{ playerId: string } | null> {
  await playerRequest(signal)
  const player = playerProjection().players.find((p) => p.rtrId === rtrId.trim().toUpperCase())
  return player ? { playerId: player.id } : null
}
