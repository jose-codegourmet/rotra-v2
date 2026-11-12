import { addMatchRequestToQueue } from '@rotra/db/queue/match-requests'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/**
 * Q-REQUESTS › Match › **Add to queue**: a protected waiting match at the end of the Main Queue,
 * then Auto Queue like any add. Replies `{ result: match, queueRevision, autoPlaced }`; a retry
 * returns the same match.
 */
export async function POST(
  _request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/match-requests/[requestId]/add'>,
) {
  const { sessionId, requestId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => ({
    status: 201,
    body: await addMatchRequestToQueue(club, sessionId, { requestId }),
  }))
}
