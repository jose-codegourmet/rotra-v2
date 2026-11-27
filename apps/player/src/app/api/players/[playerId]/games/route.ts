import { optionalPlayerId } from '@rotra/db/player/club-page'
import { pageGames, parseGamesPage, readPublicMatchHistory } from '@rotra/db/player/projections'
import { handleVisitorRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/**
 * P-MATCH-HISTORY read: valid finalized sessions only, grouped by session. A masked player has no
 * game history and masked faces carry no player ID (B-54), so the answer is per viewer and never
 * cached. `?limit=` (1 to 50 sessions) and `?offset=` page it, newest first, and add `nextOffset`; without
 * `limit` the whole history is sent as before. Each game court carries its win chance
 * (D-2026-11-27-03), which only this ROTRA Player read asks for.
 */
export async function GET(request: Request, ctx: RouteContext<'/api/players/[playerId]/games'>) {
  const { playerId } = await ctx.params
  const page = parseGamesPage(new URL(request.url).searchParams)
  return handleVisitorRequest('player.match-history', async () => {
    const games = await readPublicMatchHistory(
      playerId,
      await optionalPlayerId(routeCookieAdapter(await cookies())),
      true,
    )
    return { body: page ? pageGames(games, page) : { games } }
  })
}
