import { clearQueue } from '@rotra/db/queue/match-queue'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** Q-QUEUE › Clear queue: every waiting match removed in one write; a retry removes nothing. */
export async function POST(
  _request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/matches/clear'>,
) {
  const { sessionId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => ({
    body: await clearQueue(club, sessionId),
  }))
}
