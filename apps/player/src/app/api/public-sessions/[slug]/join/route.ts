import { joinSessionAsPlayer } from '@rotra/db/queue/public-session'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'
import {
  forbidden,
  preflight,
  queueCorsHeaders,
  withCors,
} from '@/app/api/public-sessions/queueCors'

export const OPTIONS = preflight

/**
 * Q-PUBLIC-JOIN · **Request to join as NAME** (D-2026-11-09-02) from the Queue session page. The
 * body's `placement` (D-2026-11-11-02) is slot (default), waitlist, or from_waitlist for a waitlisted
 * Player's **Join from waitlist**. A club member on an upcoming session that does not always require
 * a request is placed right away (D-2026-11-12-02): the reply then carries `requestId: null`.
 */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/public-sessions/[slug]/join'>,
) {
  const { headers, ok } = queueCorsHeaders(request)
  if (!ok) return forbidden(headers)
  // A JSON body forces the CORS preflight, so only the paired Queue origin can send it.
  if (!request.headers.get('Content-Type')?.startsWith('application/json'))
    return forbidden(headers)
  const { slug } = await ctx.params
  const body = await readJsonBody(request)
  const placement = typeof body.placement === 'string' ? body.placement : null
  const response = await handleAccountRequest(
    'player',
    routeCookieAdapter(await cookies()),
    async (player) => ({
      body: await joinSessionAsPlayer(player, slug, {
        // The service validates the value; anything else is `invalid`.
        placement: placement as 'slot' | 'waitlist' | 'from_waitlist' | null,
      }),
    }),
  )
  return withCors(response, headers)
}
