import { removeCourt, updateCourt } from '@rotra/db/queue/session-preparation'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** Courts and time › Remove court (soft); at least one stays. */
export async function DELETE(
  _request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/courts/[courtId]'>,
) {
  const { sessionId, courtId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => ({
    body: { court: await removeCourt(club, sessionId, courtId) },
  }))
}

/** Add / Edit court › Save: label, planned start (fixed after use) and advisory end. */
export async function PATCH(
  request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/courts/[courtId]'>,
) {
  const { sessionId, courtId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    const court = await updateCourt(club, sessionId, courtId, {
      label: text(body.label),
      startsAt: typeof body.startsAt === 'string' ? body.startsAt : null,
      openUntil: typeof body.openUntil === 'string' ? body.openUntil : null,
    })
    return { body: { court } }
  })
}
