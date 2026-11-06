import { swapWithQueue } from '@rotra/db/queue/match-control'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/**
 * Q-ON-COURT › Swap with the queue: rechecks that `withMatchId` is still the next ready match; it
 * takes the court(s) On court and this match takes its queue position, in one transaction.
 */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/matches/[matchId]/swap'>,
) {
  const { sessionId, matchId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    return {
      body: await swapWithQueue(club, sessionId, {
        operationId: text(body.operationId),
        matchId,
        withMatchId: text(body.withMatchId),
      }),
    }
  })
}
