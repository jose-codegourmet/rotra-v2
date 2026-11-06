import { cancelSession } from '@rotra/db/queue/session-cancel'
import { ServiceError } from '@rotra/db/service/errors'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/**
 * Q-PREPARE / D-CANCEL-SESSION: prepared → cancelled, final. `{ reason }` is optional (a string
 * up to 120 characters, or null). Online only; a retry on a cancelled session returns it unchanged.
 */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/cancel'>,
) {
  const { sessionId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    const reason = body.reason ?? null
    if (reason !== null && typeof reason !== 'string') throw new ServiceError('invalid')
    return { body: await cancelSession(club, sessionId, reason) }
  })
}
