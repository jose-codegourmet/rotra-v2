import { getAdminSession } from '../admin-account/fetchers'
import { foundingCities } from '../fixtures/foundingCities'
import { MockError } from '../mock/errors'
import { delay } from '../mock/latency'
import { type MockState, readMockState } from '../mock/store'
import type { Player } from '../player/player.types'
import { effectiveRankingVersion } from '../ranking-settings/rankingSettings.rules'
import { createdOnFromRtrId, rankStatusOf } from './adminPlayer.rules'
import type {
  AdminPlayer,
  AdminPlayerDetail,
  AdminPlayerList,
  AdminPlayerListParams,
} from './adminPlayer.types'
import { levelBandOf, selectAdminPlayers } from './management.rules'

export function adminPlayerOf(state: MockState, player: Player): AdminPlayer {
  const account = state.playerAccounts.find((entry) => entry.playerId === player.id)
  const clubRecords = state.clubPlayers
    .filter((entry) => entry.playerId === player.id)
    .sort((a, b) => (a.addedAt ?? 0) - (b.addedAt ?? 0))
  const rank = state.playerRanks[player.id]
  const levelIndex = rank?.levelIndex ?? null
  const recentStandardMatches = rank?.recentCount ?? 0
  return {
    id: player.id,
    name: player.fullName,
    nickname: player.nickname ?? clubRecords.find((entry) => entry.nickname)?.nickname ?? null,
    rtrId: player.rtrId,
    createdByClubId: state.adminPlayerRecords[player.id]?.adminCreated
      ? (state.adminPlayerRecords[player.id]?.createdByClubId ?? null)
      : (clubRecords[0]?.clubId ?? null),
    createdOn: createdOnFromRtrId(player.rtrId),
    picture: state.playerProfiles.find((p) => p.playerId === player.id)?.picture ?? null,
    addedOn: createdOnFromRtrId(player.rtrId),
    levelBand: levelBandOf(levelIndex),
    registeredPlace: {
      code: player.rtrId.split('-')[2] ?? '',
      name:
        foundingCities.find((c) => c.code === player.rtrId.split('-').slice(1, 3).join('-'))
          ?.name ??
        player.rtrId.split('-')[2] ??
        '',
    },
    clubs: clubRecords.map((c) => ({
      clubId: c.clubId,
      name: state.clubs.find((club) => club.id === c.clubId)?.name ?? 'Unknown club',
      addedAt: c.addedAt ?? null,
      identity: c.identity,
    })),
    archivedAt: state.adminPlayerRecords[player.id]?.archivedAt ?? null,
    revision: state.adminPlayerRecords[player.id]?.revision ?? 1,
    removalReason: hasPlayerGames(state, player.id)
      ? 'Has match history; archive instead'
      : (account?.claimed ?? !state.adminPlayerRecords[player.id]?.adminCreated)
        ? 'Already registered; archive instead'
        : hasPlayerReferences(state, player.id)
          ? 'Has retained references; archive instead'
          : null,
    phone: account?.phone,
    email: account?.email,
    claimed: account?.claimed ?? !state.adminPlayerRecords[player.id]?.adminCreated,
    phoneHidden: account?.phoneHidden ?? false,
    levelIndex,
    recentStandardMatches,
    rankStatus: rankStatusOf(
      levelIndex,
      recentStandardMatches,
      effectiveRankingVersion(state.rankingPolicyVersions).recentStandardMatchThreshold,
    ),
  }
}

/**
 * A-PLAYERS: privileged search, filtered counts, duplicate groups and numbered pagination.
 * This in-memory implementation has no cross-app transport or durable persistence.
 */
export async function listAdminPlayers(
  params: AdminPlayerListParams = {},
  signal?: AbortSignal,
): Promise<AdminPlayerList> {
  if ((await getAdminSession()).kind !== 'owner')
    throw new MockError('permission', 'Only ROTRA Admin can view player management.')
  await delay(400, signal)
  const state = readMockState()
  const all = state.players.map((player) => adminPlayerOf(state, player))
  return selectAdminPlayers(all, params)
}

/** A-PLAYER-DETAIL; null = not found. */
export async function getAdminPlayer(
  id: string,
  signal?: AbortSignal,
): Promise<AdminPlayerDetail | null> {
  if ((await getAdminSession()).kind !== 'owner')
    throw new MockError('permission', 'Only ROTRA Admin can view player management.')
  await delay(400, signal)
  const state = readMockState()
  const player = state.players.find((entry) => entry.id === id)
  if (!player) return null
  return {
    ...adminPlayerOf(state, player),
    samePlayers: state.players
      .filter((entry) => entry.id !== id && entry.fullName === player.fullName)
      .map((entry) => ({ id: entry.id, name: entry.fullName, rtrId: entry.rtrId })),
  }
}

export function hasPlayerGames(state: MockState, id: string) {
  if (state.playerGames[id]?.some((s) => s.games.length)) return true
  const clubIds = new Set(state.clubPlayers.filter((p) => p.playerId === id).map((p) => p.id))
  const rosterIds = new Set(
    state.roster.filter((p) => clubIds.has(p.clubPlayerId)).map((p) => p.id),
  )
  return state.matches.some((m) => [...m.teamA, ...m.teamB].some((id) => rosterIds.has(id)))
}
export function hasPlayerReferences(state: MockState, id: string) {
  const clubIds = new Set(state.clubPlayers.filter((p) => p.playerId === id).map((p) => p.id))
  return (
    state.roster.some((p) => clubIds.has(p.clubPlayerId)) ||
    state.contactChangeRequests.some((r) => r.playerId === id)
  )
}

/** Admin history is independent of Player Information dev scenarios. */
export async function getAdminPlayerGames(id: string, signal?: AbortSignal) {
  if ((await getAdminSession()).kind !== 'owner')
    throw new MockError('permission', 'Only ROTRA Admin can view player management.')
  await delay(300, signal)
  const state = readMockState()
  return [...(state.playerGames[id] ?? [])].sort(
    (a, b) => Date.parse(b.finishedAt) - Date.parse(a.finishedAt),
  )
}

export async function getAdminPlayersByIds(ids: string[], signal?: AbortSignal) {
  if ((await getAdminSession()).kind !== 'owner')
    throw new MockError('permission', 'Only ROTRA Admin can view player management.')
  await delay(200, signal)
  const state = readMockState(),
    selected = new Set(ids)
  return state.players.filter((p) => selected.has(p.id)).map((p) => adminPlayerOf(state, p))
}
