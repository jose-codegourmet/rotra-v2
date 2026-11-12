import { declineMatchRequest } from '@rotra/db/queue/match-requests'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** Q-REQUESTS › Match › **Decline**: the request closes as declined; nothing is queued. */
export async function POST(
  _request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/match-requests/[requestId]/decline'>,
) {
  const { sessionId, requestId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => ({
    body: await declineMatchRequest(club, sessionId, { requestId }),
  }))
}
