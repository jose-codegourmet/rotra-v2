import { placeOnCourt } from '@rotra/db/queue/match-control'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** Q-DISPATCH › Put on court: revalidates, then takes every court and player hold; no timer. */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/matches/[matchId]/place'>,
) {
  const { sessionId, matchId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    const courtIds = Array.isArray(body.courtIds)
      ? body.courtIds.filter((id): id is string => typeof id === 'string')
      : []
    return {
      body: await placeOnCourt(club, sessionId, {
        operationId: text(body.operationId),
        matchId,
        courtIds,
      }),
    }
  })
}
