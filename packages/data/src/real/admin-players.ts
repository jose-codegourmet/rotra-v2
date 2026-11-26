import type { AdminPlayerCreateValues, AdminPlayerEditValues } from '@rotra/schema/admin-player'
import type {
  AdminPlayer,
  AdminPlayerBulkResult,
  AdminPlayerDetail,
  AdminPlayerEdit,
  AdminPlayerEditResult,
  AdminPlayerListParams,
} from '../admin-player/adminPlayer.types'
import { duplicateGroups, selectAdminPlayers } from '../admin-player/management.rules'
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
      showProfileStats?: boolean
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

/**
 * Add player: the same "Review matches, then Create anyway" check as mock mode against the real
 * directory, then the save. Real mode saves the club's unclaimed record (no RTR ID yet).
 */
export async function realCreateAdminPlayer(values: AdminPlayerCreateValues): Promise<AdminPlayer> {
  if (!values.allowDuplicate) {
    const players = await directory()
    const match = duplicateGroups([
      ...players,
      { id: 'new', name: values.name, phone: values.phone, email: values.email },
    ]).find((group) => group.ids.includes('new'))
    if (match)
      throw new MockError(
        'conflict',
        `${match.reasons.join(', ')}: ${match.ids
          .filter((id) => id !== 'new')
          .map((id) => players.find((p) => p.id === id))
          .map((p) => p?.rtrId ?? p?.name)
          .join(', ')}. Review matches, then Create anyway.`,
      )
  }
  const { player } = await realRequest<{ player: WireAdminPlayer }>('/api/players', {
    method: 'POST',
    body: values,
  })
  return playerOf(player)
}

/** Set gender for the selected players: one result per player, saved on `players.gender`. */
export async function realSetAdminPlayersGender(input: {
  ids: string[]
  gender: 'male' | 'female' | null
}): Promise<AdminPlayerBulkResult[]> {
  const { results } = await realRequest<{ results: AdminPlayerBulkResult[] }>(
    '/api/players/gender',
    { method: 'PATCH', body: input },
  )
  return results
}
