import { readPlayerClubs } from '@rotra/db/player/player-clubs'
import { handlePublicRead } from '@rotra/db/service/handler'

/**
 * P-PUBLIC-PROFILE · Clubs public read (#766): the player's current clubs (id, name, initials,
 * logo). No joined-via line: the owner reads their own clubs from `/api/me/clubs`.
 */
export async function GET(_request: Request, ctx: RouteContext<'/api/players/[playerId]/clubs'>) {
  const { playerId } = await ctx.params
  return handlePublicRead('player.public-clubs', async () => ({
    body: { clubs: await readPlayerClubs(playerId) },
  }))
}
