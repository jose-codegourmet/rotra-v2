import { markNoShow, undoNoShow } from '@rotra/db/queue/session-roster'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/**
 * Q-ROSTER › No show (cancelled) (#839, D-2026-11-14-02): on a live session, an away roster player
 * with no games comes off tonight's roster (`no_show_at`) and their slot opens. Refused (409) before
 * Start, while they are in a match, or once they are here or have played. Repeat-safe.
 */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/roster/[rosterId]/no-show'>,
) {
  const { sessionId, rosterId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    return {
      body: await markNoShow(club, sessionId, { operationId: text(body.operationId), rosterId }),
    }
  })
}

/** Back to roster (#839): the no show takes a free slot again; refused (409) while the roster is full. */
export async function DELETE(
  request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/roster/[rosterId]/no-show'>,
) {
  const { sessionId, rosterId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    return {
      body: await undoNoShow(club, sessionId, { operationId: text(body.operationId), rosterId }),
    }
  })
}
