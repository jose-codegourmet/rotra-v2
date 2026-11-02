import { readPlayerMatchHistory } from '@rotra/db/player/projections'
import { handlePublicRead } from '@rotra/db/service/handler'

/** P-MATCH-HISTORY public read: valid finalized sessions only, grouped by session. */
export async function GET(_request: Request, ctx: RouteContext<'/api/players/[playerId]/games'>) {
  const { playerId } = await ctx.params
  return handlePublicRead('player.match-history', async () => ({
    body: { games: await readPlayerMatchHistory(playerId) },
  }))
}
