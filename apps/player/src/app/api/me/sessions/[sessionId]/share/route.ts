import { readMyShareSession } from '@rotra/db/player/my-sessions'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** Share card data for one of the signed-in player's finished sessions, from saved results. */
export async function GET(
  _request: Request,
  ctx: RouteContext<'/api/me/sessions/[sessionId]/share'>,
) {
  const { sessionId } = await ctx.params
  return handleAccountRequest('player', routeCookieAdapter(await cookies()), async (player) => ({
    body: await readMyShareSession(player, sessionId),
  }))
}
