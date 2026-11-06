import { openCourtsEarly, undoCourtEarlyOpen } from '@rotra/db/queue/session-preparation'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

type Context = RouteContext<'/api/sessions/[sessionId]/courts/[courtId]/open-early'>

/** Court card › Start anyway: opens a court not open yet now. Repeat-safe. */
export async function POST(_request: Request, ctx: Context) {
  const { sessionId, courtId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const [court] = await openCourtsEarly(club, sessionId, courtId)
    return { body: { court } }
  })
}

/** Court card › Undo early open: back to Not open yet while the court is free. Repeat-safe. */
export async function DELETE(_request: Request, ctx: Context) {
  const { sessionId, courtId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => ({
    body: { court: await undoCourtEarlyOpen(club, sessionId, courtId) },
  }))
}
