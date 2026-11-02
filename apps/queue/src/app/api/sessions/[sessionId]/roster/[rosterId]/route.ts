import { removeRosterPlayer } from '@rotra/db/queue/session-roster'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** Q-ROSTER › Remove from a prepared roster (the entry is released, not deleted). */
export async function DELETE(
  _request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/roster/[rosterId]'>,
) {
  const { sessionId, rosterId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => ({
    body: { removed: await removeRosterPlayer(club, sessionId, rosterId) },
  }))
}
