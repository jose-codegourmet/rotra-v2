import { fillOpenedCourts, setCourtFillMode } from '@rotra/db/queue/match-control'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/**
 * Q-COURTS › Manual Queue | Auto Queue. Online only (no sync replay). Turning Auto on fills every
 * free open court in the same transaction; the reply lists the matches it put On court.
 */
export async function PATCH(
  request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/court-fill'>,
) {
  const { sessionId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    return { body: await setCourtFillMode(club, sessionId, { mode: text(body.mode) }) }
  })
}

/** Q-COURTS › Auto Queue for courts that reached their planned opening time. */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/court-fill'>,
) {
  const { sessionId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    const courtIds = Array.isArray(body.courtIds)
      ? body.courtIds.filter((id): id is string => typeof id === 'string')
      : []
    return { body: await fillOpenedCourts(club, sessionId, { courtIds }) }
  })
}
