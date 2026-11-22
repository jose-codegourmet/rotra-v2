import { claimTransferLink } from '@rotra/db/queue/slot-transfers'
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
 * Q-PUBLIC-JOIN · **Transfer link** › Claim this slot (#1012): the first signed-in player to accept
 * takes the link; the transfer then waits for the Queue Master. 409 with the reason when someone
 * else claimed it first, the viewer is the sender or already has a slot, or the link closed.
 */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/public-sessions/[slug]/slot-transfer/link/claim'>,
) {
  const { headers, ok } = queueCorsHeaders(request)
  if (!ok) return forbidden(headers)
  if (!request.headers.get('Content-Type')?.startsWith('application/json'))
    return forbidden(headers)
  const { slug } = await ctx.params
  const response = await handleAccountRequest(
    'player',
    routeCookieAdapter(await cookies()),
    async (player) => {
      const body = await readJsonBody(request)
      return { body: await claimTransferLink(player, slug, text(body.token)) }
    },
  )
  return withCors(response, headers)
}
