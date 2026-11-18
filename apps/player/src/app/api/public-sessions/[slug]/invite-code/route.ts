import { getSessionInviteCode } from '@rotra/db/queue/public-session'
import { handleAccountRequest } from '@rotra/db/service/handler'
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
 * Q-PUBLIC-JOIN · **Session invite** (D-2026-11-09-08) from the Queue session page: the signed-in
 * Player's code for this session, made on the first call and the same on every later one. A POST,
 * because the first call writes. Confirmed or waitlisted Players only, while the session is
 * Prepared and takes join requests.
 */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/public-sessions/[slug]/invite-code'>,
) {
  const { headers, ok } = queueCorsHeaders(request)
  if (!ok) return forbidden(headers)
  // A JSON body forces the CORS preflight, so only the paired Queue origin can send it.
  if (!request.headers.get('Content-Type')?.startsWith('application/json'))
    return forbidden(headers)
  const { slug } = await ctx.params
  const response = await handleAccountRequest(
    'player',
    routeCookieAdapter(await cookies()),
    async (player) => ({ body: await getSessionInviteCode(player, slug) }),
  )
  return withCors(response, headers)
}
