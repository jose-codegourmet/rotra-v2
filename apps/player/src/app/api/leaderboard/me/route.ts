import { readMyLeaderboardPosition } from '@rotra/db/player/leaderboard'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** P-LEADERBOARD › the signed-in player's own position; null when not listed (always, until #247). */
export async function GET() {
  return handleAccountRequest('player', routeCookieAdapter(await cookies()), async (player) => ({
    body: { position: await readMyLeaderboardPosition(player.playerId) },
  }))
}
