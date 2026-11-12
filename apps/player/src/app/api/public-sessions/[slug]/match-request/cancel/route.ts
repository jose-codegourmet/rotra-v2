import { cancelMatchRequest } from '@rotra/db/queue/match-requests'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'
import {
  forbidden,
  preflight,
  queueCorsHeaders,
  withCors,
} from '@/app/api/public-sessions/queueCors'

export const OPTIONS = preflight

/** My night › **Cancel** on the Player's open match request. `{ matchRequestId, message }`. */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/public-sessions/[slug]/match-request/cancel'>,
) {
  const { headers, ok } = queueCorsHeaders(request)
  if (!ok) return forbidden(headers)
  // A JSON body forces the CORS preflight, so only the paired Queue origin can send it.
  if (!request.headers.get('Content-Type')?.startsWith('application/json'))
    return forbidden(headers)
  const { slug } = await ctx.params
  const response = await handleAccountRequest(
    'player',
    routeCookieAdapter(await cookies()),
    async (player) => ({ body: await cancelMatchRequest(player, slug) }),
  )
  return withCors(response, headers)
}
