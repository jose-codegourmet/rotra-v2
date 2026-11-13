import { getAdminSession } from '../admin-account/fetchers'
import type { ClubPlayer } from '../club-player/clubPlayer.types'
import { clubPictureState } from '../club-player/clubPlayerPicture.rules'
import { foundingCities } from '../fixtures/foundingCities'
import { MockError } from '../mock/errors'
import { delay } from '../mock/latency'
import { type MockState, readMockState } from '../mock/store'
import type { Player } from '../player/player.types'
import { resolveMockProfileBanner } from '../profile-banner/fetchers'
import { effectiveRankingVersion } from '../ranking-settings/rankingSettings.rules'
import {
  realGetAdminPlayer,
  realGetAdminPlayerGames,
  realGetAdminPlayerSocialLinks,
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

/** A club's unclaimed record: saved with a phone, no global player yet (D-2026-11-11-03). */
export function isClubOnlyRecord(record: ClubPlayer) {
  return (
    !record.playerId &&
    !record.removedAt &&
    !record.linkedToClubPlayerId &&
    (record.identity === 'unclaimed' || record.identity === 'pending')
  )
}

/**
 * A-PLAYERS row for a club's unclaimed record (owner answer, November 12, 2026): listed under its
 * club as "Not registered yet", with no RTR ID. Its `id` is the club player id; the place is the
 * club's founding location, where the RTR ID would be allocated on registration.
 */
export function clubOnlyAdminPlayerOf(state: MockState, record: ClubPlayer): AdminPlayer {
  const club = state.clubs.find((club) => club.id === record.clubId)
  const addedOn = record.addedAt ? new Date(record.addedAt).toISOString().slice(0, 10) : ''
  const place = foundingCities.find((c) => c.code === club?.locationCode)
  return {
    id: record.id,
    name: record.fullName,
    nickname: record.nickname,
    rtrId: null,
    createdByClubId: record.clubId,
    createdOn: addedOn,
    addedOn,
    picture: clubPictureState(record, null).reference,
    levelBand: null,
    registeredPlace: {
      code: club?.locationCode.split('-')[1] ?? '',
      name: place?.name ?? club?.locationCode ?? '',
    },
    clubs: [
      {
        clubId: record.clubId,
        name: club?.name ?? 'Unknown club',
        addedAt: record.addedAt ?? null,
        identity: 'unclaimed',
      },
    ],
    archivedAt: null,
    revision: 1,
    removalReason: 'Saved by its club only; the club manages this record',
    phone: state.privatePhones[record.id],
    email: undefined,
    claimed: false,
    phoneHidden: false,
    levelIndex: null,
    recentStandardMatches: 0,
    rankStatus: rankStatusOf(
      null,
      0,
      effectiveRankingVersion(state.rankingPolicyVersions).recentStandardMatchThreshold,
    ),
  }
}

/** Every A-PLAYERS row: allocated player identities, then the clubs' unclaimed records. */
function allAdminPlayers(state: MockState) {
  return [
    ...state.players.map((player) => adminPlayerOf(state, player)),
    ...state.clubPlayers.filter(isClubOnlyRecord).map((r) => clubOnlyAdminPlayerOf(state, r)),
  ]
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
  return selectAdminPlayers(allAdminPlayers(readMockState()), params)
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
  const all = allAdminPlayers(state)
  const player = all.find((entry) => entry.id === id)
  if (!player) return null
  return {
    ...player,
    samePlayers: all
      .filter((entry) => entry.id !== id && entry.name === player.name)
      .map((entry) => ({ id: entry.id, name: entry.name, rtrId: entry.rtrId })),
  }
}

/** Profile fields for Admin Quick view, including private profiles; null for club-only records. */
export async function getAdminPlayerProfile(
  id: string,
  signal?: AbortSignal,
): Promise<{
  socialLinks: import('../player/player.types').PlayerProfile['socialLinks']
  /** The resolved Profile banner for Quick view (mock mode); missing draws the default */
  bannerKey?: string
  bannerImageUrl?: string | null
} | null> {
  if (isRealDataMode()) return realGetAdminPlayerSocialLinks(id, signal)
  if ((await getAdminSession()).kind !== 'owner')
    throw new MockError('permission', 'Only ROTRA Admin can view player management.')
  await delay(400, signal)
  const profile = readMockState().playerProfiles.find((entry) => entry.playerId === id)
  return profile
    ? { socialLinks: profile.socialLinks, ...resolveMockProfileBanner(profile.bannerId) }
    : null
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
    const result = await realGetAdminPlayerSocialLinks(id, signal)
    if (!result) return null
    return { ...result.edit, revision: Number(result.edit.revision) }
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
  const selected = new Set(ids)
  return allAdminPlayers(readMockState()).filter((p) => selected.has(p.id))
}
