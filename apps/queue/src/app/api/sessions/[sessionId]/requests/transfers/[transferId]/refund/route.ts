import { rejectAndRefundSlotTransfer } from '@rotra/db/queue/slot-transfers'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/**
 * Q-REQUESTS › Slot transfers › **Reject and refund** (#1014): rejects the transfer and records a
 * manual full refund of the slot's whole cash (ROTRA moves no money; the payment marks stay), then
 * cancels the sender's registration and gives the freed slot to the first eligible waitlisted
 * player (FIFO). Capacity unchanged. 409 when it was decided already, the session started, nothing
 * was paid, or the refund differs from the one the Queue Master confirmed.
 */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/requests/transfers/[transferId]/refund'>,
) {
  const { sessionId, transferId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    return {
      body: await rejectAndRefundSlotTransfer(club, sessionId, {
        transferId,
        // The full refund the Queue Master confirmed; a different one now is 409
        expectedRefundMinor: body.expectedRefundMinor,
      }),
    }
  })
}
