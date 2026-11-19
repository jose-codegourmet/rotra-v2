import { optionalPlayerId } from '@rotra/db/player/club-page'
import { readPublicMatchHistory } from '@rotra/db/player/projections'
import { handleVisitorRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/**
 * P-MATCH-HISTORY read: valid finalized sessions only, grouped by session. A masked player has no
 * game history and masked faces carry no player ID (B-54), so the answer is per viewer and never
 * cached.
 */
export async function GET(_request: Request, ctx: RouteContext<'/api/players/[playerId]/games'>) {
  const { playerId } = await ctx.params
  return handleVisitorRequest('player.match-history', async () => ({
    body: {
      games: await readPublicMatchHistory(
        playerId,
        await optionalPlayerId(routeCookieAdapter(await cookies())),
      ),
    },
  }))
}
