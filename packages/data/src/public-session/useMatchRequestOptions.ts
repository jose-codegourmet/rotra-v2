'use client'
import { useQuery } from '@tanstack/react-query'
import { getMatchRequestOptions } from './fetchers'
import { publicSessionKeys } from './queryKeys'
/**
 * What Request a match needs (Q17.14): `data.allowedFormats` (pill order; empty = the session takes
 * no match requests), `data.minimum`, and `data.players`, the present players other than the viewer
 * (`id` is the roster row id a request names; `games`, `level`, `playingOn`, `restMinutes` feed the
 * sheet and its picker). Enabled only when `enabled` is true (the sheet is open). Every player write
 * refetches it with the other queries. Real mode reads it from the Player app.
 */
export function useMatchRequestOptions(
  slug: string,
  playerId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: publicSessionKeys.matchRequestOptions(slug, playerId ?? ''),
    queryFn: () => getMatchRequestOptions(slug, playerId ?? ''),
    enabled: enabled && slug !== '' && !!playerId,
  })
}
