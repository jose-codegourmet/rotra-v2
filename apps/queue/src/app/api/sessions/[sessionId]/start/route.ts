import { startSession } from '@rotra/db/queue/session-preparation'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/**
 * Q-PREPARE › Start session: prepared → active, levels lock. `expectedRevision` is the displayed
 * session; `newEndAt` (ISO) is the required new end of a late or other-day start.
 */
export async function POST(request: Request, ctx: RouteContext<'/api/sessions/[sessionId]/start'>) {
  const { sessionId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    return {
      body: await startSession(
        club,
        sessionId,
        text(body.expectedRevision),
        text(body.newEndAt) || null,
      ),
    }
  })
}
