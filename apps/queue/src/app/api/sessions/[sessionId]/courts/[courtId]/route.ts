import { removeCourt } from '@rotra/db/queue/session-preparation'
import { handleAccountRequest } from '@rotra/db/service/handler'
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
