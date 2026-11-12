import type { AdminPlayerEditValues } from '@rotra/schema/admin-player'
import type {
  AdminPlayer,
  AdminPlayerDetail,
  AdminPlayerEdit,
  AdminPlayerEditResult,
  AdminPlayerListParams,
} from '../admin-player/adminPlayer.types'
import { selectAdminPlayers } from '../admin-player/management.rules'
import { MockError } from '../mock/errors'
import type { PlayerSessionRecord } from '../player/player.types'
import { RealRequestError, realRequest } from './client'

type WireAdminPlayer = Omit<AdminPlayer, 'revision'> & { revision: string }
const playerOf = (player: WireAdminPlayer): AdminPlayer => ({
  ...player,
  revision: Number(player.revision),
})

/** Same directory selectors as mock mode; private contacts stay on the Admin transport. */
async function directory(signal?: AbortSignal) {
  const { players } = await realRequest<{ players: WireAdminPlayer[] }>('/api/players', { signal })
  return players.map(playerOf)
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

/** Admin Quick view profile fields; a club-only record has no public player profile. */
export async function realGetAdminPlayerSocialLinks(id: string, signal?: AbortSignal) {
  try {
    return await realRequest<{
      socialLinks: import('../player/player.types').PlayerProfile['socialLinks']
      edit: Omit<AdminPlayerEdit, 'revision'> & { revision: string }
    }>(`/api/players/${encodeURIComponent(id)}`, { signal })
  } catch (error) {
    if (error instanceof RealRequestError && error.status === 404) return null
    throw error
  }
}

export async function realGetAdminPlayerGames(id: string, signal?: AbortSignal) {
  return (
    await realRequest<{ games: PlayerSessionRecord[] }>(
      `/api/players/${encodeURIComponent(id)}/games`,
      { signal },
    )
  ).games
}

/** Full Admin edit, returning only fields that were actually saved and any Auth warnings. */
export async function realUpdateAdminPlayer(
  input: AdminPlayerEditValues & { id: string; revision: number },
): Promise<AdminPlayerEditResult> {
  try {
    const { id, revision, ...values } = input
    const result = await realRequest<
      Omit<AdminPlayerEditResult, 'player'> & { player: WireAdminPlayer }
    >(`/api/players/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: { revision: String(revision), values },
    })
    return { ...result, player: playerOf(result.player) }
  } catch (error) {
    if (error instanceof RealRequestError && error.status === 409)
      throw new MockError(
        'conflict',
        'This player changed since you opened the form. Reload before editing.',
        error.fieldErrors,
      )
    throw error
  }
}
