import { readSessionRequests } from '@rotra/db/queue/match-requests'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/**
 * Q-REQUESTS › the session's Requests read (`SessionRequests` with ISO times): open match requests,
 * oldest first, each spot with games, level and where the player is now. Join requests stay on the
 * roster read in real mode, so `join` and `dropOuts` are empty.
 */
export async function GET(
  _request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/requests'>,
) {
  const { sessionId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => ({
    body: await readSessionRequests(club, sessionId),
  }))
}
