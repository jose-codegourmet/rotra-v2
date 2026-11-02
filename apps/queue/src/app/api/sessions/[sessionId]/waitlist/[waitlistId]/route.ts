import { removeFromWaitlist } from '@rotra/db/queue/session-roster'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** Q-WAITLIST › Remove from the waitlist. */
export async function DELETE(
  _request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/waitlist/[waitlistId]'>,
) {
  const { sessionId, waitlistId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => ({
    body: { removed: await removeFromWaitlist(club, sessionId, waitlistId) },
  }))
}
