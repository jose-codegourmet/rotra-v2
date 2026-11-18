import { LEADERBOARD_LIMIT } from '@rotra/data/leaderboard/types'
import { parseLeaderboardPeriod, readPeriodLeaderboard } from '@rotra/db/player/leaderboard'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  // Open after the Google deadline too: the leaderboard stays reachable for every player.
  return handleAccountRequest(
    'player',
    routeCookieAdapter(await cookies()),
    async (player) => {
      const param = new URL(request.url).searchParams.get('period')
      const board = await readPeriodLeaderboard(parseLeaderboardPeriod(param))
      const standing = board.own(player.playerId)
      if (param !== null) return { body: { standing } }
      const position =
        standing.position !== null && standing.position <= LEADERBOARD_LIMIT
          ? standing.position
          : null
      return { body: { position } }
    },
    { allowWithoutGoogle: true },
  )
}
