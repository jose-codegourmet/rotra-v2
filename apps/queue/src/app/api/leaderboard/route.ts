import { parseLeaderboardPage, readPeriodLeaderboard } from '@rotra/db/player/leaderboard'
import { handleVisitorRequest } from '@rotra/db/service/handler'

/**
 * Q-LEADERBOARDS › ROTRA (D-2026-11-25-04): the same public read as the Player app's ROTRA
 * leaderboard, served here so the Queue app's `realRequest('/api/leaderboard')` reaches it. The
 * viewer is always null on Queue.
 */
export async function GET(request: Request) {
  return handleVisitorRequest('leaderboard.list', async () => {
    const { offset, limit, period } = parseLeaderboardPage(new URL(request.url).searchParams)
    const board = await readPeriodLeaderboard(period)
    return { body: await board.page(offset, limit, null) }
  })
}
