import { startMatch } from '@rotra/db/queue/match-control'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/**
 * Q-ON-COURT › Start match: an On court match keeps the holds it took at placement (send no
 * courts); a waiting match is placed and started at once on the courts sent (older one-step start).
 */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/matches/[matchId]/start'>,
) {
  const { sessionId, matchId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    const courtIds = Array.isArray(body.courtIds)
      ? body.courtIds.filter((id): id is string => typeof id === 'string')
      : []
    return {
      body: await startMatch(club, sessionId, {
        operationId: text(body.operationId),
        matchId,
        courtIds,
      }),
    }
  })
}
