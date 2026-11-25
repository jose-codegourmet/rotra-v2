import { swapFromMatch } from '@rotra/db/queue/match-control'
import { ServiceError } from '@rotra/db/service/errors'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/**
 * Q-ON-COURT / Q-MATCH › Swap from match: the player coming out and an opponent in the same match
 * trade places. `aTeam` is the team the client saw `aId` on, so a retry never switches them back.
 */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/matches/[matchId]/swap-from-match'>,
) {
  const { sessionId, matchId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    const aTeam = text(body.aTeam)
    if (aTeam !== 'A' && aTeam !== 'B')
      throw new ServiceError('invalid', { aTeam: 'Choose one player from each team.' })
    return {
      body: await swapFromMatch(club, sessionId, {
        operationId: text(body.operationId),
        matchId,
        aId: text(body.aId),
        bId: text(body.bId),
        aTeam,
      }),
    }
  })
}
