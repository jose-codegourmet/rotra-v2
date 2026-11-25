import { pauseMatch } from '@rotra/db/queue/match-control'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** Q-CONSOLE / Q-MATCH › Pause match: a Playing match goes back to Getting ready on its court(s). */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/matches/[matchId]/pause'>,
) {
  const { sessionId, matchId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    return {
      body: await pauseMatch(club, sessionId, { operationId: text(body.operationId), matchId }),
    }
  })
}
