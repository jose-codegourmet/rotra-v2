import { leaveMyClub } from '@rotra/db/player/my-clubs'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** Leave club: marks the signed-in player's own row removed; the row stays for history. */
export async function DELETE(_request: Request, ctx: RouteContext<'/api/me/clubs/[clubId]'>) {
  const { clubId } = await ctx.params
  return handleAccountRequest('player', routeCookieAdapter(await cookies()), async (player) => ({
    body: await leaveMyClub(player, clubId),
  }))
}
