'use client'
import { useQuery } from '@tanstack/react-query'
import { getSessionPageAccount } from './fetchers'
import { publicSessionKeys } from './queryKeys'
/**
 * The signed-in Player for the session page's account bar (#693): `name`, `nickname`, `rtrId`,
 * `pictureUrl`. Mock mode only; real mode reads the same fields from `usePlayerSessionAccess`.
 */
export function useSessionPageAccount(playerId: string | null | undefined) {
  return useQuery({
    queryKey: publicSessionKeys.account(playerId ?? ''),
    queryFn: () => getSessionPageAccount(playerId ?? ''),
    enabled: !!playerId,
  })
}
