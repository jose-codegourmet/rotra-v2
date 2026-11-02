import { regenerateQueue } from '@rotra/db/queue/match-queue'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** Q-QUEUE › Regenerate: rebuilds waiting drafts against the displayed queue revision. */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/matches/regenerate'>,
) {
  const { sessionId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    return {
      body: await regenerateQueue(club, sessionId, {
        operationId: text(body.operationId),
        expectedQueueRevision: text(body.expectedQueueRevision),
      }),
    }
  })
}
