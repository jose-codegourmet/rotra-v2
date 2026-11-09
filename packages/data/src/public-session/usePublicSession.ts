'use client'
import { useQuery } from '@tanstack/react-query'
import { getPublicSession, getSignedInSession } from './fetchers'
import { publicSessionKeys } from './queryKeys'
/**
 * The visitor version of the public session page by slug: every name masked, participants capped,
 * no Courts now or Queue. `visitor` is the guest's own browser (the /s route): offline the refetch
 * fails and any cached copy stays. The operator preview leaves it off.
 */
export function usePublicSession(slug: string, options?: { visitor?: boolean }) {
  return useQuery({
    queryKey: publicSessionKeys.detail(slug),
    queryFn: () => getPublicSession(slug, { visitor: options?.visitor }),
    enabled: slug !== '',
  })
}
/**
 * The signed-in version of the same snapshot (D-2026-11-09-09), for a signed-in ROTRA Player
 * (`playerId` from the mock sign-in, `useSession('player')`). `data: SignedInPublicSession`:
 * `participants` and `waitlist` carry `name` (full for registered players, masked otherwise),
 * `masked`, `nickname`, `rtrId` (registered only: link `/player/find/<rtrId>`) and `isViewer` (the
 * You pill); no three-row cap; `courtsNow` and `queue` for Details; `amountDuePerPlayer` for the
 * Payment row; `results.standings[].isViewer` marks the viewer's row. Refetches when the tab
 * regains focus; no polling. Mock mode only: real mode errors with NotConnectedError for now.
 */
export function useSignedInPublicSession(slug: string, playerId: string | null | undefined) {
  return useQuery({
    queryKey: publicSessionKeys.signedIn(slug, playerId ?? ''),
    queryFn: () => getSignedInSession(slug, playerId ?? ''),
    enabled: slug !== '' && !!playerId,
    refetchOnWindowFocus: true,
  })
}
