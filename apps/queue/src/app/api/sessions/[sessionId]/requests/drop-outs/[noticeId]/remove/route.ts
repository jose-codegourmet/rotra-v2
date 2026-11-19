import { removeDropOutNotice } from '@rotra/db/queue/drop-out-notices'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/**
 * Q-REQUESTS › Can't make it › **Remove from roster**: the notice closes as removed and the roster
 * entry is released, in one transaction (prepared sessions).
 */
export async function POST(
  _request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/requests/drop-outs/[noticeId]/remove'>,
) {
  const { sessionId, noticeId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => ({
    body: await removeDropOutNotice(club, sessionId, noticeId),
  }))
}
