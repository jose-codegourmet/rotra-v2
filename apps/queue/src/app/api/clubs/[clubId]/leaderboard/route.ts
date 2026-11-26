import {
  parseLeaderboardPage,
  readPeriodLeaderboard,
  requireLeaderboardClub,
} from '@rotra/db/player/leaderboard'
import { handleVisitorRequest } from '@rotra/db/service/handler'

/**
 * Q-LEADERBOARDS › Club (D-2026-11-25-04): the same public read as the Player app's club
 * leaderboard. Queue cannot verify a Player sign-in, so the viewer is always null; names and
 * pictures are full on a leaderboard anyway. Unknown club → 404.
 */
export async function GET(request: Request, ctx: RouteContext<'/api/clubs/[clubId]/leaderboard'>) {
  const { clubId } = await ctx.params
  return handleVisitorRequest('leaderboard.list', async () => {
    const { offset, limit, period } = parseLeaderboardPage(new URL(request.url).searchParams)
    await requireLeaderboardClub(clubId)
    const board = await readPeriodLeaderboard(period, { clubId })
    return { body: await board.page(offset, limit, null) }
  })
}
