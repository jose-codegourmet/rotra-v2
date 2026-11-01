import type {
  AdminPlayer,
  AdminPlayerDetail,
  AdminPlayerListParams,
} from '../admin-player/adminPlayer.types'
import { selectAdminPlayers } from '../admin-player/management.rules'
import type { PlayerSessionRecord } from '../player/player.types'
import { realRequest } from './client'

/** Same directory selectors as mock mode; private contacts stay on the Admin transport. */
async function directory(signal?: AbortSignal) {
  const { players } = await realRequest<{
    players: (Omit<AdminPlayer, 'revision'> & { revision: string })[]
  }>('/api/players', { signal })
  return players.map((player) => ({ ...player, revision: Number(player.revision) }))
}

export async function realListAdminPlayers(params: AdminPlayerListParams, signal?: AbortSignal) {
  return selectAdminPlayers(await directory(signal), params)
}

export async function realGetAdminPlayer(
  id: string,
  signal?: AbortSignal,
): Promise<AdminPlayerDetail | null> {
  const players = await directory(signal)
  const player = players.find((p) => p.id === id)
  if (!player) return null
  return {
    ...player,
    samePlayers: players
      .filter((p) => p.id !== id && p.name === player.name)
      .map(({ id, name, rtrId }) => ({ id, name, rtrId })),
  }
}

export async function realGetAdminPlayersByIds(ids: string[], signal?: AbortSignal) {
  const selected = new Set(ids)
  return (await directory(signal)).filter((p) => selected.has(p.id))
}

export async function realGetAdminPlayerGames(id: string, signal?: AbortSignal) {
  return (
    await realRequest<{ games: PlayerSessionRecord[] }>(
      `/api/players/${encodeURIComponent(id)}/games`,
      { signal },
    )
  ).games
}
