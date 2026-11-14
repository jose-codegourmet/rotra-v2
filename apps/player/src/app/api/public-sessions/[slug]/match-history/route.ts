import { readPublicMatchHistory } from '@rotra/db/queue/public-session'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'
import { forbidden, queueCorsHeaders, withCors } from '@/app/api/public-sessions/queueCors'

/**
 * Q-PUBLIC-JOIN › Match history (2026-11-13 finished session log): a finished session's matches for
 * the signed-in Player, in the `PublicMatchHistory` shape (epoch-ms times), or `null` before the
 * finish. Only the Player's own matches until the club shares the results. A credentialed read on
 * the Player origin, like My night; only the paired Queue origin may call it.
 */
export async function GET(
  request: Request,
  ctx: RouteContext<'/api/public-sessions/[slug]/match-history'>,
) {
  const { headers, ok } = queueCorsHeaders(request)
  if (!ok) return forbidden(headers)
  const { slug } = await ctx.params
  const response = await handleAccountRequest(
    'player',
    routeCookieAdapter(await cookies()),
    async (player) => ({ body: await readPublicMatchHistory(player, slug) }),
  )
  return withCors(response, headers)
}
