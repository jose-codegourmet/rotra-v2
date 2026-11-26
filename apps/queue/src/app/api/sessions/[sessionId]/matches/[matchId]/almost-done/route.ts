import { setAlmostDone } from '@rotra/db/queue/match-control'
import { ServiceError } from '@rotra/db/service/errors'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** Q-CONSOLE / Q-MATCH › Almost done: the switch on a Playing match, on or off (D-2026-11-25-02). */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/matches/[matchId]/almost-done'>,
) {
  const { sessionId, matchId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    if (typeof body.on !== 'boolean') throw new ServiceError('invalid')
    return {
      body: await setAlmostDone(club, sessionId, {
        operationId: text(body.operationId),
        matchId,
        on: body.on,
      }),
    }
  })
}
