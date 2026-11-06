import { addCourt } from '@rotra/db/queue/session-preparation'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/**
 * Courts and time › Add court with its planned start (null = session start) and advisory end.
 * `courtId` is client-generated, so a retry adds one court.
 */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/courts'>,
) {
  const { sessionId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    const court = await addCourt(club, sessionId, {
      courtId: text(body.courtId),
      label: text(body.label),
      startsAt: typeof body.startsAt === 'string' ? body.startsAt : null,
      openUntil: typeof body.openUntil === 'string' ? body.openUntil : null,
    })
    return { status: 201, body: { court } }
  })
}
