import { readPublicRankingPolicies } from '@rotra/db/player/ranking-settings'
import { handlePublicRead } from '@rotra/db/service/handler'

/** The ranking settings versions' public numbers (the newest is in effect); no Admin notes. */
export async function GET() {
  return handlePublicRead('ranking.settings', async () => ({
    body: { versions: await readPublicRankingPolicies() },
  }))
}
