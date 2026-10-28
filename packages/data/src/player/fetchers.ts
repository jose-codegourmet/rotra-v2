import { playerRequest } from '../leaderboard/request'
import { readMockState } from '../mock/store'
import type { PlayerProfile, PlayerRank, PlayerSessionRecord } from './player.types'
import { playerProjection } from './projection'

export async function getPlayerRank(
  playerId: string,
  signal?: AbortSignal,
): Promise<PlayerRank | null> {
  await playerRequest(signal)
  return playerProjection().ranks[playerId] ?? null
}
export async function getPlayerGames(
  playerId: string,
  signal?: AbortSignal,
): Promise<PlayerSessionRecord[]> {
  await playerRequest(signal)
  return playerProjection().games[playerId] ?? []
}
export async function findPlayerByRtrId(
  rtrId: string,
  signal?: AbortSignal,
): Promise<{ playerId: string } | null> {
  await playerRequest(signal)
  const player = playerProjection().players.find((p) => p.rtrId === rtrId.trim().toUpperCase())
  return player ? { playerId: player.id } : null
}

export async function getPlayerProfile(
  playerId: string,
  signal?: AbortSignal,
): Promise<PlayerProfile | null> {
  await playerRequest(signal)
  return readMockState().playerProfiles.find((player) => player.playerId === playerId) ?? null
}
