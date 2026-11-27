import { readPlayerMatchHistory } from '@rotra/db/player/projections'
import { handlePublicRead } from '@rotra/db/service/handler'

/**
 * P-MATCH-HISTORY public read: valid finalized sessions only, grouped by session. Each game court
 * carries its win chance (D-2026-11-27-03), which only this ROTRA Player read asks for.
 */
export async function GET(_request: Request, ctx: RouteContext<'/api/players/[playerId]/games'>) {
  const { playerId } = await ctx.params
  return handlePublicRead('player.match-history', async () => ({
    body: { games: await readPlayerMatchHistory(playerId, { winChance: true }) },
  }))
}
