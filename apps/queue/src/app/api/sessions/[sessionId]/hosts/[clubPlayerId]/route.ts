import { removeSessionHost } from '@rotra/db/queue/session-hosts'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/**
 * Session management › Hosts › Remove (#1005, D-2026-11-22-01): ends the host designation only.
 * The player's slot or waitlist place and their trusted-host status stay.
 */
export async function DELETE(
  _request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/hosts/[clubPlayerId]'>,
) {
  const { sessionId, clubPlayerId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => ({
    body: await removeSessionHost(club, sessionId, { clubPlayerId }),
  }))
}
