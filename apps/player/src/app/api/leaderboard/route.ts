import { optionalPlayerId } from '@rotra/db/player/club-page'
import { parseLeaderboardPage, readPeriodLeaderboard } from '@rotra/db/player/leaderboard'
import { handleVisitorRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  return handleVisitorRequest('leaderboard.list', async () => {
    const { offset, limit, period } = parseLeaderboardPage(new URL(request.url).searchParams)
    const viewerId = await optionalPlayerId(routeCookieAdapter(await cookies()))
    const board = await readPeriodLeaderboard(period)
    return { body: await board.page(offset, limit, viewerId) }
  })
}
