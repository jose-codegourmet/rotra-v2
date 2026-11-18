import { selfCheckIn } from '@rotra/db/queue/public-session'
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

/**
 * Q-PUBLIC-JOIN · **I'm here** (D-2026-11-09-03) from the Queue session page: the signed-in
 * Player's own roster entry becomes Present with the “checked in themselves” mark. Live sessions
 * only; refused while the club has self check-in off; 409 when already present.
 */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/public-sessions/[slug]/check-in'>,
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
    async (player) => ({ body: await selfCheckIn(player, slug) }),
  )
  return withCors(response, headers)
}
