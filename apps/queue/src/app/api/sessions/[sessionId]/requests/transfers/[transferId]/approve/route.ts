import { approveSlotTransfer } from '@rotra/db/queue/slot-transfers'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/**
 * Q-REQUESTS › Slot transfers › **Approve** (#1011): with the level the Queue Master chose, the
 * sender's slot goes to the recipient in one transaction (capacity unchanged; a waitlisted
 * recipient leaves the waitlist). 409 when it was decided already, the session started, or the
 * recipient got a slot meanwhile.
 */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/requests/transfers/[transferId]/approve'>,
) {
  const { sessionId, transferId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    return {
      body: await approveSlotTransfer(club, sessionId, { transferId, level: text(body.level) }),
    }
  })
}
