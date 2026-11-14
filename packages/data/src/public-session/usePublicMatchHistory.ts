'use client'
import { useQuery } from '@tanstack/react-query'
import { getPublicMatchHistory } from './fetchers'
import { publicSessionKeys } from './queryKeys'
/**
 * A finished session's **Match history** for the signed-in Player (2026-11-13 finished session
 * log): `data: PublicMatchHistory | null` for `MatchHistory` (`@rotra/ui/public-match-history`),
 * null before the finish. Until the club shares the results only the Player's own matches are
 * listed (`shared` false); `total` counts every match. Faces carry `participant` for the profile
 * card when the access read lists the full roster. Refetches when the tab regains focus. Real mode
 * reads it from the Player app (the Player's own sign-in), like My night; the mock signed-in read
 * carries the same shape as `history`.
 */
export function usePublicMatchHistory(
  slug: string,
  playerId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: publicSessionKeys.history(slug, playerId ?? ''),
    queryFn: () => getPublicMatchHistory(slug, playerId ?? ''),
    enabled: slug !== '' && !!playerId && enabled,
    refetchOnWindowFocus: true,
  })
}
