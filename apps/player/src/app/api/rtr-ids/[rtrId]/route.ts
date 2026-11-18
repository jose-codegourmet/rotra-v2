import { optionalPlayerId } from '@rotra/db/player/club-page'
import { findPublicProfileByRtrId } from '@rotra/db/player/profile'
import { handleVisitorRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

export async function GET(_request: Request, ctx: RouteContext<'/api/rtr-ids/[rtrId]'>) {
  const { rtrId } = await ctx.params
  return handleVisitorRequest('player.public-profile', async () => {
    const viewerId = await optionalPlayerId(routeCookieAdapter(await cookies()))
    return { body: { playerId: (await findPublicProfileByRtrId(rtrId, viewerId)).playerId } }
  })
}
