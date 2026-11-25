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
      // Places are shared (1, 1, 2), so a place number under 50 can still be past the cut: only
      // a standing with no cutoff comparison is on the public list.
      const position = standing.cutoffWins === undefined ? standing.position : null
      return { body: { position } }
    },
    { allowWithoutGoogle: true },
  )
}
