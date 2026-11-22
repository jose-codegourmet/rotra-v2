import { createTransferLink } from '@rotra/db/queue/slot-transfers'
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
 * Q-PUBLIC-JOIN · **Transfer my slot** › Create a transfer link (#1012): the signed-in confirmed
 * Player makes a single-claim link for a recipient with no ROTRA account, before the start only.
 * The body carries the plaintext token once; only its digest is stored. 409 when a transfer is
 * already pending on the slot.
 */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/public-sessions/[slug]/slot-transfer/link'>,
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
    async (player) => {
      const body = await readJsonBody(request)
      return { body: await createTransferLink(player, slug, { transferId: text(body.transferId) }) }
    },
  )
  return withCors(response, headers)
}
