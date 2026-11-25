import { optionalPlayerId } from '@rotra/db/player/club-page'
import {
  parseLeaderboardPage,
  readPeriodLeaderboard,
  requireLeaderboardClub,
} from '@rotra/db/player/leaderboard'
import { handleVisitorRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/**
 * P-CLUB-PAGE › Leaderboard and P-CLUB-LEADERBOARD (D-2026-11-25-04): the club's leaderboard, the
 * ROTRA rules over its own sessions' games. Public with full names; the viewer only decides which
 * rows open a profile. Unknown club → 404.
 */
export async function GET(request: Request, ctx: RouteContext<'/api/clubs/[clubId]/leaderboard'>) {
  const { clubId } = await ctx.params
  return handleVisitorRequest('leaderboard.list', async () => {
    const { offset, limit, period } = parseLeaderboardPage(new URL(request.url).searchParams)
    await requireLeaderboardClub(clubId)
    const viewerId = await optionalPlayerId(routeCookieAdapter(await cookies()))
    const board = await readPeriodLeaderboard(period, { clubId })
    return { body: await board.page(offset, limit, viewerId) }
  })
}
