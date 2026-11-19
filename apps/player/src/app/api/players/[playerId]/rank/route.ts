import { optionalPlayerId } from '@rotra/db/player/club-page'
import { readPlayerRank } from '@rotra/db/player/projections'
import { handleVisitorRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/**
 * P-RANK-DETAIL read: the stored rank projection of an approved algorithm, or null (no rank yet).
 * No rank formula is approved (#247), so the level stays null and nobody is leaderboard-eligible. A
 * masked player (B-54) reads as the masked name only, so the answer is per viewer and never cached.
 */
export async function GET(_request: Request, ctx: RouteContext<'/api/players/[playerId]/rank'>) {
  const { playerId } = await ctx.params
  return handleVisitorRequest('player.public-profile', async () => ({
    body: {
      rank: await readPlayerRank(
        playerId,
        await optionalPlayerId(routeCookieAdapter(await cookies())),
      ),
    },
  }))
}
