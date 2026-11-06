import { setSessionEnd } from '@rotra/db/queue/session-preparation'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** Courts and time › Set end time: `endAt` (ISO) at the displayed revision. */
export async function POST(request: Request, ctx: RouteContext<'/api/sessions/[sessionId]/end'>) {
  const { sessionId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    return {
      body: await setSessionEnd(club, sessionId, {
        endAt: text(body.endAt),
        expectedRevision: text(body.expectedRevision),
      }),
    }
  })
}
