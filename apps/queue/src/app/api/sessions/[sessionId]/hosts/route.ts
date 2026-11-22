import { listSessionHosts } from '@rotra/db/queue/session-hosts'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/**
 * Q-SETUP › Hosts (#1004, D-2026-11-22-01): the session's current hosts. They are written by the
 * setup save (`POST /api/sessions`, `PATCH /api/sessions/[sessionId]` with `hostClubPlayerIds`).
 */
export async function GET(_request: Request, ctx: RouteContext<'/api/sessions/[sessionId]/hosts'>) {
  const { sessionId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => ({
    body: { hosts: await listSessionHosts(club, sessionId) },
  }))
}
