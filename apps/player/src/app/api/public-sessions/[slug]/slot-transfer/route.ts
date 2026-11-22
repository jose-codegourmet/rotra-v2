import { requestSlotTransfer } from '@rotra/db/queue/slot-transfers'
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
 * Q-PUBLIC-JOIN · **Transfer my slot** › Send transfer request (#1011) from the Queue session page:
 * the signed-in confirmed Player asks to hand their slot to a registered ROTRA player found by exact
 * RTR ID, before the start only. Nothing moves until the Queue Master approves; 409 when a transfer
 * is already pending or the recipient already has a slot. Repeat-safe on `transferId`.
 */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/public-sessions/[slug]/slot-transfer'>,
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
      return {
        body: await requestSlotTransfer(player, slug, {
          transferId: text(body.transferId),
          rtrId: text(body.rtrId),
        }),
      }
    },
  )
  return withCors(response, headers)
}
