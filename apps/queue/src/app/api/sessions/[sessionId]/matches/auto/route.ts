import { autoQueue } from '@rotra/db/queue/match-queue'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { int, readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** Q-QUEUE › Auto queue: the operator's batch of 2, 3, 4 or 6, against the displayed queue revision. */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/matches/auto'>,
) {
  const { sessionId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    return {
      status: 201,
      body: await autoQueue(club, sessionId, {
        operationId: text(body.operationId),
        n: int(body.n),
        expectedQueueRevision: text(body.expectedQueueRevision),
      }),
    }
  })
}
