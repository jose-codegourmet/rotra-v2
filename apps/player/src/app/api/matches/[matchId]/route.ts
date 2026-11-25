import { optionalPlayerId } from '@rotra/db/player/club-page'
import { readMatchPage } from '@rotra/db/player/match-page'
import { handleVisitorRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/**
 * P-MATCH-PAGE public read: one match of a valid finalized session, the same for every player in
 * it. Anyone may read it, but faces are masked per viewer on the server, so the response is private
 * and never cached. Unknown match, or one that is not public → 404.
 */
export async function GET(_request: Request, ctx: RouteContext<'/api/matches/[matchId]'>) {
  const { matchId } = await ctx.params
  const store = routeCookieAdapter(await cookies())
  return handleVisitorRequest('player.match-page', async () => ({
    body: { match: await readMatchPage(matchId, await optionalPlayerId(store)) },
  }))
}
