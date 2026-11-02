import { searchLeaderboard } from '@rotra/db/player/leaderboard'
import { handlePublicRead } from '@rotra/db/service/handler'

/** P-LEADERBOARD name search (`?q=`) over listed players: the first 50 hits and the full count. */
export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get('q') ?? '').slice(0, 100)
  return handlePublicRead('leaderboard.list', async () => ({ body: await searchLeaderboard(q) }))
}
