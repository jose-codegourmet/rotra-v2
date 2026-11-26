import { backToPreparation } from '@rotra/db/queue/session-preparation'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/**
 * Q-CONSOLE Settings tab › Setup › Back to preparation… (D-BACK-TO-PREP): active → prepared while no game has
 * started. `expectedRevision` is the displayed session.
 */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/back-to-preparation'>,
) {
  const { sessionId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    return { body: await backToPreparation(club, sessionId, text(body.expectedRevision)) }
  })
}
