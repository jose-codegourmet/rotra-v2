import { stepDownToWaitlist } from '@rotra/db/queue/session-roster'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/**
 * Q-ROSTER / Q-POOL › Move to waitlist (#735): the roster player steps down to the front of the
 * waitlist. Refused (409) while they are in an unfinished match. Repeat-safe on `operationId`.
 */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/roster/[rosterId]/waitlist'>,
) {
  const { sessionId, rosterId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    return {
      body: await stepDownToWaitlist(club, sessionId, {
        operationId: text(body.operationId),
        rosterId,
      }),
    }
  })
}
