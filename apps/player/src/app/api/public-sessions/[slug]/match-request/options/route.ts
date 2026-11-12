import { readMatchRequestOptions } from '@rotra/db/queue/match-requests'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'
import { forbidden, queueCorsHeaders, withCors } from '@/app/api/public-sessions/queueCors'

/**
 * What Request a match needs (Q17.14), `MatchRequestOptions`: allowed formats in pill order, the
 * minimum and the present players other than the viewer. Players on the session's roster only.
 */
export async function GET(
  request: Request,
  ctx: RouteContext<'/api/public-sessions/[slug]/match-request/options'>,
) {
  const { headers, ok } = queueCorsHeaders(request)
  if (!ok) return forbidden(headers)
  const { slug } = await ctx.params
  const response = await handleAccountRequest(
    'player',
    routeCookieAdapter(await cookies()),
    async (player) => ({ body: await readMatchRequestOptions(player, slug) }),
  )
  return withCors(response, headers)
}
