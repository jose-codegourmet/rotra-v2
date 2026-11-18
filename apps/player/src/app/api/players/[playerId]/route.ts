import { optionalPlayerId } from '@rotra/db/player/club-page'
import { readPublicProfile } from '@rotra/db/player/profile'
import { handleVisitorRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

export async function GET(_request: Request, ctx: RouteContext<'/api/players/[playerId]'>) {
  const { playerId } = await ctx.params
  return handleVisitorRequest('player.public-profile', async () => ({
    body: {
      profile: await readPublicProfile(
        playerId,
        await optionalPlayerId(routeCookieAdapter(await cookies())),
      ),
    },
  }))
}
