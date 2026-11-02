import { readPublicProfile } from '@rotra/db/player/profile'
import { handlePublicRead } from '@rotra/db/service/handler'

/** P-PUBLIC-PROFILE public read: the allowlisted `PlayerProfile`; no contacts, claim or privacy. */
export async function GET(_request: Request, ctx: RouteContext<'/api/players/[playerId]'>) {
  const { playerId } = await ctx.params
  return handlePublicRead('player.public-profile', async () => ({
    body: { profile: await readPublicProfile(playerId) },
  }))
}
