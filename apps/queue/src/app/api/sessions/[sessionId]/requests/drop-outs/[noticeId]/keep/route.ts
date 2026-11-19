import { keepDropOutNotice } from '@rotra/db/queue/drop-out-notices'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** Q-REQUESTS › Can't make it › **Keep**: the notice closes as kept; the Player stays on the roster. */
export async function POST(
  _request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/requests/drop-outs/[noticeId]/keep'>,
) {
  const { sessionId, noticeId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => ({
    body: await keepDropOutNotice(club, sessionId, noticeId),
  }))
}
