import { invalidateMatch } from '@rotra/db/queue/match-control'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** Q-MATCH › Invalid: the permanent decision gives no game credit to anyone. */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/matches/[matchId]/invalid'>,
) {
  const { sessionId, matchId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    return {
      body: await invalidateMatch(club, sessionId, {
        operationId: text(body.operationId),
        matchId,
      }),
    }
  })
}
