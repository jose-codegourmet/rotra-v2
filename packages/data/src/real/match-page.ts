import type { MatchPage } from '../match-page/matchPage.types'
import { RealRequestError, realRequest } from './client'

/**
 * The public match page in real mode: `/api/matches/[matchId]`, masked for the viewer on the
 * server. Null on 404 (unknown match, or not one of a valid finalized session).
 */
export async function realGetMatchPage(
  matchId: string,
  signal?: AbortSignal,
): Promise<MatchPage | null> {
  try {
    const { match } = await realRequest<{ match: MatchPage }>(
      `/api/matches/${encodeURIComponent(matchId)}`,
      { signal },
    )
    return match
  } catch (error) {
    if (error instanceof RealRequestError && error.status === 404) return null
    throw error
  }
}
