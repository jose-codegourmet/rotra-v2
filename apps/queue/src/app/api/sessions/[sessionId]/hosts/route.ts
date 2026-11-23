import { addSessionHost, listSessionHosts } from '@rotra/db/queue/session-hosts'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/**
 * Q-SETUP › Hosts (#1004, D-2026-11-22-01): the session's current hosts. They are written by the
 * setup save (`POST /api/sessions`, `PATCH /api/sessions/[sessionId]` with `hostClubPlayerIds`) and,
 * before or during the session, by POST here and DELETE `/hosts/[clubPlayerId]` (#1005).
 */
export async function GET(_request: Request, ctx: RouteContext<'/api/sessions/[sessionId]/hosts'>) {
  const { sessionId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => ({
    body: { hosts: await listSessionHosts(club, sessionId) },
  }))
}

/** Session management › Hosts › Add host (#1005): one trusted host, registered as a player. */
export async function POST(request: Request, ctx: RouteContext<'/api/sessions/[sessionId]/hosts'>) {
  const { sessionId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    return {
      status: 201,
      body: await addSessionHost(club, sessionId, { clubPlayerId: text(body.clubPlayerId) }),
    }
  })
}
