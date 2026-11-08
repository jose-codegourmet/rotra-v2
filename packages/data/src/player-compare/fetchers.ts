import { getSession } from '../auth/fetchers'
import { MockError } from '../mock/errors'
import { readMockState } from '../mock/store'
import { getPlayerGames, getPlayerProfile, getPlayerRank } from '../player/fetchers'
import { isRealDataMode } from '../real/mode'
import type { ComparePlayer, PlayerCompare, PlayerCompareOptions } from './playerCompare.types'
import {
  compareGroups,
  compareStats,
  overallCompareWinRate,
  PLAYER_COMPARE_PAGE_SIZE,
  sharedPlayerGames,
} from './projection'
import { realGetPlayerCompare } from './real'

/** viewerId scopes the cache; the signed-in session remains the authority for who is comparing. */
export async function getPlayerCompare(
  viewerId: string,
  otherId: string,
  options: PlayerCompareOptions = {},
  signal?: AbortSignal,
): Promise<PlayerCompare | null> {
  if (isRealDataMode()) return realGetPlayerCompare(viewerId, otherId, options, signal)
  const session = await getSession('player')
  if (!session || session.account.id !== viewerId)
    throw new MockError('permission', 'Sign in to compare.')
  if (viewerId === otherId) return null
  const readPlayer = async (playerId: string): Promise<ComparePlayer | null> => {
    const [profile, rank, games] = await Promise.all([
      getPlayerProfile(playerId, signal),
      getPlayerRank(playerId, signal),
      getPlayerGames(playerId, signal),
    ])
    if (!profile) return null
    return {
      profile: {
        playerId: profile.playerId,
        fullName: profile.fullName,
        nickname: profile.nickname,
        picture: profile.picture,
      },
      rank,
      overallWinRate: overallCompareWinRate(games),
    }
  }
  const [viewer, other] = await Promise.all([readPlayer(viewerId), readPlayer(otherId)])
  if (!viewer || !other) return null
  const groups = compareGroups(sharedPlayerGames(readMockState(), viewerId, otherId))
  const filter = options.filter ?? 'all'
  const games = groups[filter]
  const requested = options.page ?? 0
  const page = Math.min(
    Number.isFinite(requested) ? Math.max(0, Math.floor(requested)) : 0,
    Math.max(0, Math.ceil(games.length / PLAYER_COMPARE_PAGE_SIZE) - 1),
  )
  return {
    viewer,
    other,
    counts: { all: groups.all.length, h2h: groups.h2h.length, together: groups.together.length },
    stats: {
      all: compareStats(groups.all),
      h2h: compareStats(groups.h2h),
      together: compareStats(groups.together),
    },
    filter,
    page,
    pageSize: PLAYER_COMPARE_PAGE_SIZE,
    total: games.length,
    games: games.slice(page * PLAYER_COMPARE_PAGE_SIZE, (page + 1) * PLAYER_COMPARE_PAGE_SIZE),
  }
}
