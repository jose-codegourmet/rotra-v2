import { extendSession } from '@rotra/db/queue/session-preparation'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { int, readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** Courts and time › Extend by 30 or 60 minutes at the displayed revision. */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/extend'>,
) {
  const { sessionId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    const minutes = int(body.minutes) as 30 | 60
    return { body: await extendSession(club, sessionId, text(body.expectedRevision), minutes) }
  })
}
