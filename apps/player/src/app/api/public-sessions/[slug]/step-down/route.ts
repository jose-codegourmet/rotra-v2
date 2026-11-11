import { movePlayerToWaitlist } from '@rotra/db/queue/public-session'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
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
 * Q-PUBLIC-JOIN · **Move me to the waitlist** (#735) from the Queue session page: the signed-in
 * Player's own roster entry steps down to the front of the waitlist. 409 with “You're in a match.
 * Ask the Queue Master to finish or remove it first.” while they are in a match. Repeat-safe on
 * the body's `operationId`.
 */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/public-sessions/[slug]/step-down'>,
) {
  const { headers, ok } = queueCorsHeaders(request)
  if (!ok) return forbidden(headers)
  // A JSON body forces the CORS preflight, so only the paired Queue origin can send it.
  if (!request.headers.get('Content-Type')?.startsWith('application/json'))
    return forbidden(headers)
  const { slug } = await ctx.params
  const body = await readJsonBody(request)
  const response = await handleAccountRequest(
    'player',
    routeCookieAdapter(await cookies()),
    async (player) => ({
      body: await movePlayerToWaitlist(player, slug, { operationId: text(body.operationId) }),
    }),
  )
  return withCors(response, headers)
}
