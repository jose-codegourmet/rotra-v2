import { setRosterLevel } from '@rotra/db/queue/session-roster'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** Q-ROSTER › Set level on a prepared entry (appends an assessment). */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/roster/[rosterId]/level'>,
) {
  const { sessionId, rosterId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    return {
      body: await setRosterLevel(club, sessionId, {
        operationId: text(body.operationId),
        rosterId,
        level: text(body.level),
      }),
    }
  })
}
