import { readClubPlayerYearStats } from '@rotra/db/queue/club-players'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** Stats · YEAR on the player profile dialog: null for guests and unclaimed records. */
export async function GET(
  _request: Request,
  ctx: RouteContext<'/api/club/players/[clubPlayerId]/year-stats'>,
) {
  const { clubPlayerId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => ({
    body: { stats: await readClubPlayerYearStats(club, clubPlayerId) },
  }))
}
