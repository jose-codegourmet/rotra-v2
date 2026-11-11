import { getAdminSession } from '../admin-account/fetchers'
import { foundingCities } from '../fixtures/foundingCities'
import { MockError } from '../mock/errors'
import { delay } from '../mock/latency'
import { type MockState, readMockState } from '../mock/store'
import type { Player } from '../player/player.types'
import { effectiveRankingVersion } from '../ranking-settings/rankingSettings.rules'
import {
  realGetAdminPlayer,
  realGetAdminPlayerGames,
  realGetAdminPlayersByIds,
  realListAdminPlayers,
} from '../real/admin-players'
import { isRealDataMode } from '../real/mode'
import { createdOnFromRtrId, rankStatusOf } from './adminPlayer.rules'
import type {
  AdminPlayer,
  AdminPlayerDetail,
  AdminPlayerEdit,
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
  if (isRealDataMode()) return realListAdminPlayers(params, signal)
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
  if (isRealDataMode()) return realGetAdminPlayer(id, signal)
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

const EMPTY_LINKS = { facebook: '', instagram: '', youtube: '', linkedin: '' }

/**
 * A-PLAYER-EDIT read: the directory row plus the profile and account fields Edit changes. Admin
 * only: it carries private contacts. Never the password, only when Admin last set one.
 */
export function adminPlayerEditOf(state: MockState, player: Player): AdminPlayerEdit {
  const profile = state.playerProfiles.find((p) => p.playerId === player.id)
  const account = state.playerAccounts.find((a) => a.playerId === player.id)
  return {
    ...adminPlayerOf(state, player),
    playingStyle: profile?.playingStyle ?? '',
    experienceYears: profile?.experienceYears ?? null,
    experienceMonths: profile?.experienceMonths ?? null,
    socialLinks: { ...(profile?.socialLinks ?? EMPTY_LINKS) },
    // Admin's Private profile switch is on for both Private and Always private (D-2026-11-12-01).
    profilePrivate: (profile?.profileVisibility ?? 'public') !== 'public',
    previousPicture: account?.avatarPreviousRef ?? null,
    hasAccount: !!account,
    passwordSetAt: state.adminPlayerRecords[player.id]?.passwordSetAt ?? null,
  }
}
/**
 * A-PLAYER-EDIT; null = not found. Real mode has only the directory row so far: the profile fields
 * read as empty and only name and nickname can be saved (backend follow-up of A07.6).
 */
export async function getAdminPlayerEdit(
  id: string,
  signal?: AbortSignal,
): Promise<AdminPlayerEdit | null> {
  if (isRealDataMode()) {
    const player = await realGetAdminPlayer(id, signal)
    if (!player) return null
    const { samePlayers: _same, ...row } = player
    return {
      ...row,
      playingStyle: '',
      experienceYears: null,
      experienceMonths: null,
      socialLinks: { ...EMPTY_LINKS },
      profilePrivate: false,
      previousPicture: null,
      hasAccount: row.phone !== undefined || row.email !== undefined,
      passwordSetAt: null,
    }
  }
  if ((await getAdminSession()).kind !== 'owner')
    throw new MockError('permission', 'Only ROTRA Admin can view player management.')
  await delay(400, signal)
  const state = readMockState()
  const player = state.players.find((entry) => entry.id === id)
  return player ? adminPlayerEditOf(state, player) : null
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
  if (isRealDataMode()) return realGetAdminPlayerGames(id, signal)
  if ((await getAdminSession()).kind !== 'owner')
    throw new MockError('permission', 'Only ROTRA Admin can view player management.')
  await delay(300, signal)
  const state = readMockState()
  return [...(state.playerGames[id] ?? [])].sort(
    (a, b) => Date.parse(b.finishedAt) - Date.parse(a.finishedAt),
  )
}

export async function getAdminPlayersByIds(ids: string[], signal?: AbortSignal) {
  if (isRealDataMode()) return realGetAdminPlayersByIds(ids, signal)
  if ((await getAdminSession()).kind !== 'owner')
    throw new MockError('permission', 'Only ROTRA Admin can view player management.')
  await delay(200, signal)
  const state = readMockState(),
    selected = new Set(ids)
  return state.players.filter((p) => selected.has(p.id)).map((p) => adminPlayerOf(state, p))
}
