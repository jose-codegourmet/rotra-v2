import { readClubPage } from '@rotra/db/player/club-page'
import { handleVisitorRequest } from '@rotra/db/service/handler'

/**
 * The club profile card on the public session page reads the same P-CLUB-PAGE body as the Player
 * app. Queue cannot verify a Player sign-in, so the viewer is always null and every member name is
 * masked; the card only uses the member count and the sessions. Private, never cached. Unknown
 * club → 404.
 */
export async function GET(_request: Request, ctx: RouteContext<'/api/clubs/[clubId]'>) {
  const { clubId } = await ctx.params
  return handleVisitorRequest('player.club-page', async () => ({
    body: { page: await readClubPage(clubId, null) },
  }))
}
