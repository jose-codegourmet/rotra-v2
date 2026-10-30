import { delay } from '../mock/latency'
import { type MockState, readMockState } from '../mock/store'
import type { Player } from '../player/player.types'
import {
  ADMIN_PLAYER_PAGE_SIZE,
  createdOnFromRtrId,
  matchesAccountFilter,
  matchesAdminPlayerSearch,
  rankStatusOf,
  sameNameGroups,
} from './adminPlayer.rules'
import type {
  AdminPlayer,
  AdminPlayerDetail,
  AdminPlayerList,
  AdminPlayerListParams,
} from './adminPlayer.types'

// Admin directory over the shared demo pool (state.players, the club's real players). No admin-only
// players are seeded (user decision, 2026-10-30), so with the fixtures every identity is registered
// and ranked, and no two share a name; unclaimed, no-rank, below-requirement and same-name states
// come from story/test data. Admin-only fields are derived where the data holds them and left
// empty otherwise.

/**
 * Registered = holds a player account, or no club record says otherwise. The demo pool is all
 * registered (fixtures/players.ts); a club record marking the player unclaimed/pending without an
 * account is the only way to be unclaimed.
 */
function claimedOf(state: MockState, playerId: string, hasAccount: boolean): boolean {
  if (hasAccount) return true
  return !state.clubPlayers.some(
    (entry) =>
      entry.playerId === playerId &&
      (entry.identity === 'unclaimed' || entry.identity === 'pending'),
  )
}

function adminPlayerOf(state: MockState, player: Player): AdminPlayer {
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
    createdByClubId: clubRecords[0]?.clubId ?? null,
    createdOn: createdOnFromRtrId(player.rtrId),
    phone: account?.phone,
    email: account?.email,
    claimed: claimedOf(state, player.id, Boolean(account)),
    phoneHidden: account?.phoneHidden ?? false,
    levelIndex,
    recentStandardMatches,
    rankStatus: rankStatusOf(
      levelIndex,
      recentStandardMatches,
      state.rankingSettings.matchRequirement,
    ),
  }
}

/**
 * A-PLAYERS: privileged search (name, nickname, RTR ID, email, phone digits) with the account filter,
 * a growing limit, whole-directory counts and same-name groups across every match.
 * Swap this implementation for the real transport when the database epic lands.
 */
export async function listAdminPlayers(
  params: AdminPlayerListParams = {},
  signal?: AbortSignal,
): Promise<AdminPlayerList> {
  await delay(400, signal)
  const state = readMockState()
  const all = state.players.map((player) => adminPlayerOf(state, player))
  const registered = all.filter((player) => player.claimed).length
  const matches = all.filter(
    (player) =>
      matchesAccountFilter(player.claimed, params.account) &&
      matchesAdminPlayerSearch(player, params.q),
  )
  return {
    rows: matches.slice(0, params.limit ?? ADMIN_PLAYER_PAGE_SIZE),
    total: matches.length,
    counts: { all: all.length, registered, unclaimed: all.length - registered },
    duplicateNames: sameNameGroups(matches),
  }
}

/** A-PLAYER-DETAIL; null = not found. */
export async function getAdminPlayer(
  id: string,
  signal?: AbortSignal,
): Promise<AdminPlayerDetail | null> {
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
