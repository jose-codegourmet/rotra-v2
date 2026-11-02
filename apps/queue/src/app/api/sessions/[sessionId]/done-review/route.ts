import { reviewSessionDone } from '@rotra/db/queue/finalization'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/**
 * Q-SESSION-DONE › what would block Session done (blocker codes, active match count,
 * completeness) and the minimum-games shortfall warning. Reads only; never finishes anything.
 */
export async function GET(
  _request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/done-review'>,
) {
  const { sessionId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => ({
    body: await reviewSessionDone(club, sessionId),
  }))
}
