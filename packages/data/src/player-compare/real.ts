import { RealRequestError, realRequest } from '../real/client'
import type { PlayerCompare, PlayerCompareOptions } from './playerCompare.types'

/** The server identifies the viewer from its verified account; no client viewer ID authorizes it. */
export async function realGetPlayerCompare(
  viewerId: string,
  otherId: string,
  options: PlayerCompareOptions,
  signal?: AbortSignal,
): Promise<PlayerCompare | null> {
  const params = new URLSearchParams({
    filter: options.filter ?? 'all',
    page: String(options.page ?? 0),
  })
  try {
    const body = await realRequest<{ compare: PlayerCompare | null }>(
      `/api/players/${encodeURIComponent(otherId)}/compare?${params}`,
      { signal },
    )
    // A session change cannot populate a query cache scoped to the previous signed-in player.
    if (body.compare && body.compare.viewer.profile.playerId !== viewerId)
      throw new RealRequestError('permission', 'Sign in to compare.', 403)
    return body.compare
  } catch (error) {
    if (error instanceof RealRequestError && error.status === 404) return null
    throw error
  }
}
