import { completeMatch } from '@rotra/db/queue/match-control'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { intOrNull, readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/**
 * Q-MATCH › Team A/B wins: appends the one permanent decision and frees the courts and players.
 * `holdCourtId` (optional) keeps Auto Queue off the court the next-match picker opens for.
 */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/matches/[matchId]/result'>,
) {
  const { sessionId, matchId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    return {
      body: await completeMatch(club, sessionId, {
        operationId: text(body.operationId),
        matchId,
        winningTeam: body.winningTeam === 'A' || body.winningTeam === 'B' ? body.winningTeam : null,
        teamAScore: intOrNull(body.teamAScore),
        teamBScore: intOrNull(body.teamBScore),
        // Q-NEXT-MATCH: the freed court the picker opens for; Auto Queue leaves it free
        holdCourtId: typeof body.holdCourtId === 'string' ? body.holdCourtId : null,
      }),
    }
  })
}
