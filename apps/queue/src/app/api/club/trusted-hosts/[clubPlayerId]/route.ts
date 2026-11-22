import { removeTrustedHost } from '@rotra/db/queue/club-hosts'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/**
 * Club settings › Trusted hosts › Remove host (D-2026-11-22-01): ends the trusted-host row. The
 * saved player and every session's host records stay.
 */
export async function DELETE(
  _request: Request,
  ctx: RouteContext<'/api/club/trusted-hosts/[clubPlayerId]'>,
) {
  const { clubPlayerId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => ({
    body: await removeTrustedHost(club, { clubPlayerId }),
  }))
}
