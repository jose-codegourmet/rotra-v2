import { substitutePlayer } from '@rotra/db/queue/match-control'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** Q-MATCH › Substitute: closes the outgoing segment and opens the incoming one together. */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/matches/[matchId]/substitution'>,
) {
  const { sessionId, matchId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    return {
      body: await substitutePlayer(club, sessionId, {
        operationId: text(body.operationId),
        matchId,
        outId: text(body.outId),
        inId: text(body.inId),
      }),
    }
  })
}
