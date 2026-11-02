import { fillOpenSlots } from '@rotra/db/queue/session-roster'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** Q-WAITLIST › Fill open slots from the front of the waitlist. */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/waitlist/fill'>,
) {
  const { sessionId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    return { body: await fillOpenSlots(club, sessionId, text(body.operationId)) }
  })
}
