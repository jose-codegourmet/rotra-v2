import { findPublicProfileByRtrId } from '@rotra/db/player/profile'
import { handlePublicRead } from '@rotra/db/service/handler'

/** /find/[rtrId]: the public profile an RTR ID names. It never authorizes a claim. */
export async function GET(_request: Request, ctx: RouteContext<'/api/rtr-ids/[rtrId]'>) {
  const { rtrId } = await ctx.params
  return handlePublicRead('player.public-profile', async () => ({
    body: { playerId: (await findPublicProfileByRtrId(rtrId)).playerId },
  }))
}
