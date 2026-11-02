import { lineupOf, removeWaitingMatch, updateWaitingLineup } from '@rotra/db/queue/match-queue'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** Q-QUEUE › edit a waiting lineup or switch sides; the entry becomes manual and protected. */
export async function PATCH(
  request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/matches/[matchId]'>,
) {
  const { sessionId, matchId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    return {
      body: await updateWaitingLineup(club, sessionId, {
        operationId: text(body.operationId),
        matchId,
        lineup: lineupOf(body.lineup),
        expectedQueueRevision: text(body.expectedQueueRevision),
      }),
    }
  })
}

/** Q-QUEUE › Remove waiting match. It keeps its number as a removed draft; a retry is a no-op. */
export async function DELETE(
  request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/matches/[matchId]'>,
) {
  const { sessionId, matchId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    return {
      body: await removeWaitingMatch(club, sessionId, {
        matchId,
        expectedQueueRevision:
          typeof body.expectedQueueRevision === 'string' ? body.expectedQueueRevision : undefined,
      }),
    }
  })
}
