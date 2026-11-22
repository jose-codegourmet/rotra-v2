import { approveSlotTransfer } from '@rotra/db/queue/slot-transfers'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/**
 * Q-REQUESTS › Slot transfers › **Approve** (#1011): with the level the Queue Master chose, the
 * sender's slot goes to the recipient in one transaction (capacity unchanged; a waitlisted
 * recipient leaves the waitlist). #1013: the same transaction records the slot's payment snapshot
 * and the automatic waiver (recipient Paid in Full, owes ₱0); no payment mark changes. 409 when it
 * was decided already, the session started, the recipient got a slot meanwhile, or the waiver
 * differs from the one the Queue Master was shown.
 */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/requests/transfers/[transferId]/approve'>,
) {
  const { sessionId, transferId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    return {
      body: await approveSlotTransfer(club, sessionId, {
        transferId,
        level: text(body.level),
        // #1013: the waiver the Queue Master was shown; a different one now is 409
        expectedWaiverMinor: body.expectedWaiverMinor,
      }),
    }
  })
}
