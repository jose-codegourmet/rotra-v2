import { openCourtsEarly } from '@rotra/db/queue/session-preparation'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** Courts › Open all courts now: every court not open yet opens early. */
export async function POST(
  _request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/courts/open-early'>,
) {
  const { sessionId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => ({
    body: { courts: await openCourtsEarly(club, sessionId, null) },
  }))
}
