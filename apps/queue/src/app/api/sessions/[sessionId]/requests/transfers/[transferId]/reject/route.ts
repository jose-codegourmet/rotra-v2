import { rejectSlotTransfer } from '@rotra/db/queue/slot-transfers'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** Q-REQUESTS › Slot transfers › **Reject** (#1011): the sender keeps the slot and its payment. */
export async function POST(
  _request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/requests/transfers/[transferId]/reject'>,
) {
  const { sessionId, transferId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => ({
    body: await rejectSlotTransfer(club, sessionId, transferId),
  }))
}
