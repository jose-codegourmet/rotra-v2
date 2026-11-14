import { replacePlayer } from '@rotra/db/queue/match-control'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/**
 * Q-ON-COURT / Q-MATCH › Replace player: a lineup change on an On court or Playing match, never a
 * substitution. On a Playing match it fixes a mistake: the replacement is recorded as having played
 * the whole game and the player taken out gets nothing.
 */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/matches/[matchId]/replace'>,
) {
  const { sessionId, matchId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    return {
      body: await replacePlayer(club, sessionId, {
        operationId: text(body.operationId),
        matchId,
        outId: text(body.outId),
        inId: text(body.inId),
      }),
    }
  })
}
