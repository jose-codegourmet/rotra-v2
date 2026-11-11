import { optionalPlayerId, readClubPage } from '@rotra/db/player/club-page'
import { handleVisitorRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/**
 * P-CLUB-PAGE / P-CLUB-MEMBERS public read (#737). Anyone may read it, but names are masked per
 * viewer on the server, so the response is private and never cached. Unknown club → 404.
 */
export async function GET(_request: Request, ctx: RouteContext<'/api/clubs/[clubId]'>) {
  const { clubId } = await ctx.params
  const store = routeCookieAdapter(await cookies())
  return handleVisitorRequest('player.club-page', async () => ({
    body: { page: await readClubPage(clubId, await optionalPlayerId(store)) },
  }))
}
