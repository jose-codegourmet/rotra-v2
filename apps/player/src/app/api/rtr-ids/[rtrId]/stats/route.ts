import { readRecentGameStatsByRtrId } from '@rotra/db/player/projections'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'
import { forbidden, queueCorsHeaders, withCors } from '@/app/api/public-sessions/queueCors'

/**
 * Stats · last 90 days for the Queue session page's participant profile card (#731): a
 * credentialed read from the paired Queue origin by a signed-in Player. The cookie never travels
 * to Queue.
 */
export async function GET(request: Request, ctx: RouteContext<'/api/rtr-ids/[rtrId]/stats'>) {
  const { headers, ok } = queueCorsHeaders(request)
  if (!ok) return forbidden(headers)
  const { rtrId } = await ctx.params
  const store = await cookies()
  const response = await handleAccountRequest('player', routeCookieAdapter(store), async () => ({
    body: { stats: await readRecentGameStatsByRtrId(rtrId) },
  }))
  return withCors(response, headers)
}
