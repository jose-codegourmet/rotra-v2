import { readPlayerRank } from '@rotra/db/player/projections'
import { handlePublicRead } from '@rotra/db/service/handler'

/**
 * P-RANK-DETAIL public read: the stored rank projection, or null (no rank yet). No rank formula is
 * approved (#247), so the level stays null and nobody is leaderboard-eligible.
 */
export async function GET(_request: Request, ctx: RouteContext<'/api/players/[playerId]/rank'>) {
  const { playerId } = await ctx.params
  return handlePublicRead('player.public-profile', async () => ({
    body: { rank: await readPlayerRank(playerId) },
  }))
}
