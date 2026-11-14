import { isStatsHiddenByRtrId } from '@rotra/db/player/profile'
import { readRecentGameStatsByRtrId } from '@rotra/db/player/projections'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'
import { forbidden, queueCorsHeaders, withCors } from '@/app/api/public-sessions/queueCors'

/**
 * Latest stats for the Queue session page's participant profile card (#731): a credentialed read
 * from the paired Queue origin by a signed-in Player. The cookie never travels to Queue. A player
 * who turned off Show my profile stats (2026-11-13-player-stats-visibility) reads as
 * `{ hidden: true }` for everyone but themself.
 */
export async function GET(request: Request, ctx: RouteContext<'/api/rtr-ids/[rtrId]/stats'>) {
  const { headers, ok } = queueCorsHeaders(request)
  if (!ok) return forbidden(headers)
  const { rtrId } = await ctx.params
  const store = await cookies()
  const response = await handleAccountRequest('player', routeCookieAdapter(store), async (ctx) => ({
    body: {
      stats: (await isStatsHiddenByRtrId(rtrId, ctx.playerId))
        ? { hidden: true }
        : await readRecentGameStatsByRtrId(rtrId),
    },
  }))
  return withCors(response, headers)
}
