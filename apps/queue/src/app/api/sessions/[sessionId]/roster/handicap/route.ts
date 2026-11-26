import { setHandicap } from '@rotra/db/queue/session-roster'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/**
 * Q-POOL › Edit player › Handicap · tonight (D-2026-11-25-03). `{ operationId, rosterId, spots }`
 * saves the whole set of marked spots on one live entry; an empty list clears it.
 */
export async function PATCH(
  request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/roster/handicap'>,
) {
  const { sessionId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    return {
      body: await setHandicap(club, sessionId, {
        operationId: text(body.operationId),
        rosterId: text(body.rosterId),
        spots: Array.isArray(body.spots) ? body.spots : [],
      }),
    }
  })
}
