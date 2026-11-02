import { readLeaderboardPage } from '@rotra/db/player/leaderboard'
import { ServiceError } from '@rotra/db/service/errors'
import { handlePublicRead } from '@rotra/db/service/handler'

/**
 * P-LEADERBOARD public read (`leaderboard.list`): an `?offset=&limit=` page of listed players plus
 * the total. Empty until a rank formula is approved (#247); never fixture or computed positions.
 */
export async function GET(request: Request) {
  return handlePublicRead('leaderboard.list', async () => {
    const params = new URL(request.url).searchParams
    const offset = Number(params.get('offset') ?? 0)
    const limit = Number(params.get('limit') ?? 25)
    if (
      !Number.isInteger(offset) ||
      offset < 0 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 50
    )
      throw new ServiceError('invalid')
    return { body: await readLeaderboardPage({ offset, limit }) }
  })
}
