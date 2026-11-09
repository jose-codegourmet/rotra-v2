'use client'
import { useQuery } from '@tanstack/react-query'
import { getMyNight } from './fetchers'
import { publicSessionKeys } from './queryKeys'
/**
 * The small personal part of the signed-in read (D-2026-11-09-09): `data: MyNight`, for the My night
 * card and the Want to play? card. `stage` is `MyNightCard`'s `stage` (null when not in the session);
 * `games`, `won`, `lost`, `minimum`, `inQueue.position` / `inQueue.matchLabel`, `onCourt.courtLabel`
 * / `onCourt.matchLabel`, `waitlistPosition`, `cantMakeItSent`, `hasLeft`, `checkedIn`, `offline`,
 * `matchRequest` (open when non-null), `canInvite` and `startsAt` map onto its props one to one.
 * `joinRequest` drives the join card (pending, confirmed, declined). Own standing only. Every
 * player write refetches it with the other queries; it also refetches when the tab regains focus.
 * Mock mode only for now.
 */
export function useMyNight(slug: string, playerId: string | null | undefined) {
  return useQuery({
    queryKey: publicSessionKeys.myNight(slug, playerId ?? ''),
    queryFn: () => getMyNight(slug, playerId ?? ''),
    enabled: slug !== '' && !!playerId,
    refetchOnWindowFocus: true,
  })
}
