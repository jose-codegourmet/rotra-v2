import { optionalPlayerId } from '@rotra/db/player/club-page'
import { parseLeaderboardPeriod, readPeriodLeaderboard } from '@rotra/db/player/leaderboard'
import { handleVisitorRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  return handleVisitorRequest('leaderboard.list', async () => {
    const params = new URL(request.url).searchParams
    const q = (params.get('q') ?? '').slice(0, 100)
    const period = parseLeaderboardPeriod(params.get('period'))
    if (!q.trim()) return { body: { hits: [], total: 0 } }
    const viewerId = await optionalPlayerId(routeCookieAdapter(await cookies()))
    const board = await readPeriodLeaderboard(period)
    return { body: await board.search(q, viewerId) }
  })
}
