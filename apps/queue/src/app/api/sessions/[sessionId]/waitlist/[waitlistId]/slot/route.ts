import { giveSlot } from '@rotra/db/queue/session-roster'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** Q-WAITLIST › Give slot, even over budget. Repeat-safe on `operationId`. */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/waitlist/[waitlistId]/slot'>,
) {
  const { sessionId, waitlistId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    const entry = await giveSlot(club, sessionId, {
      operationId: text(body.operationId),
      waitlistId,
    })
    return { body: { rosterEntry: entry } }
  })
}
