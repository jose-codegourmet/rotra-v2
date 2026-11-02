import { moveMatch } from '@rotra/db/queue/match-queue'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { int, readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** Q-QUEUE › reorder a waiting match. Queue positions change; match numbers never do. */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/matches/[matchId]/position'>,
) {
  const { sessionId, matchId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    return {
      body: await moveMatch(club, sessionId, {
        matchId,
        toIndex: int(body.toIndex),
        expectedQueueRevision: text(body.expectedQueueRevision),
      }),
    }
  })
}
