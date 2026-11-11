import { setGamesPlayed } from '@rotra/db/queue/session-roster'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { int, readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/**
 * Q-POOL › Set games played (#717, D-SET-GAMES). `{ operationId, games, rosterId }` sets one live
 * entry's shown count; `{ operationId, games, all: true }` sets every live entry's. The server stores
 * the adjustment (games − counted games), so games keep counting up afterwards.
 */
export async function PATCH(
  request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/roster/games'>,
) {
  const { sessionId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    return {
      body: await setGamesPlayed(club, sessionId, {
        operationId: text(body.operationId),
        games: int(body.games),
        ...(body.all === true ? { all: true } : { rosterId: text(body.rosterId) }),
      }),
    }
  })
}
