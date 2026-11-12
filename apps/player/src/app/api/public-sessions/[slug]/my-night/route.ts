import { readMyNight } from '@rotra/db/queue/public-session'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'
import { forbidden, queueCorsHeaders, withCors } from '@/app/api/public-sessions/queueCors'

/**
 * Q-PUBLIC-JOIN › My night (D-2026-11-09-09): the signed-in Player's own night on this session, in
 * the `MyNight` shape (`matchRequest.at` as ISO). A credentialed read on the Player origin, like the
 * access read; only the paired Queue origin may call it.
 */
export async function GET(
  request: Request,
  ctx: RouteContext<'/api/public-sessions/[slug]/my-night'>,
) {
  const { headers, ok } = queueCorsHeaders(request)
  if (!ok) return forbidden(headers)
  const { slug } = await ctx.params
  const response = await handleAccountRequest(
    'player',
    routeCookieAdapter(await cookies()),
    async (player) => ({ body: await readMyNight(player, slug) }),
  )
  return withCors(response, headers)
}
