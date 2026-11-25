import { reorderSessionCourts } from '@rotra/db/queue/session-preparation'
import { ServiceError } from '@rotra/db/service/errors'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/**
 * Settings › Courts › Reorder courts (owner decision, 2026-11-25): `courtIds` is the full new order
 * of the session's live courts. Online only (no sync replay). The reply is `{ courts, moved }`: the
 * live courts in their new order and the court the toast names (null when nothing changed).
 */
export async function PATCH(
  request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/courts/order'>,
) {
  const { sessionId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    const courtIds: unknown = body.courtIds
    if (!Array.isArray(courtIds) || !courtIds.every((id): id is string => typeof id === 'string'))
      throw new ServiceError('invalid')
    return { body: await reorderSessionCourts(club, sessionId, courtIds) }
  })
}
