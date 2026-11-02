import { invalidateSession } from '@rotra/db/queue/finalization'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/**
 * Q-DONE › Mark session invalid: no official result. Refused while a match is active and after
 * Session done; a retry of an invalid session returns it unchanged.
 */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/invalid'>,
) {
  const { sessionId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    return { body: await invalidateSession(club, sessionId, { reason: text(body.reason) }) }
  })
}
