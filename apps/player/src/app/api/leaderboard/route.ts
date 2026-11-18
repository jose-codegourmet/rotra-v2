import { optionalPlayerId } from '@rotra/db/player/club-page'
import { parseLeaderboardPeriod, readPeriodLeaderboard } from '@rotra/db/player/leaderboard'
import { ServiceError } from '@rotra/db/service/errors'
import { handleVisitorRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  return handleVisitorRequest('leaderboard.list', async () => {
    const params = new URL(request.url).searchParams
    const offset = Number(params.get('offset') ?? 0)
    const limit = Number(params.get('limit') ?? 25)
    if (
      !Number.isSafeInteger(offset) ||
      offset < 0 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 50
    )
      throw new ServiceError('invalid')
    const period = parseLeaderboardPeriod(params.get('period'))
    const viewerId = await optionalPlayerId(routeCookieAdapter(await cookies()))
    const board = await readPeriodLeaderboard(period)
    return { body: await board.page(offset, limit, viewerId) }
  })
}
