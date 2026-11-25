'use client'
import { useQuery } from '@tanstack/react-query'
import { isRealDataMode } from '../real/mode'
import { getSessionPageAccount } from './fetchers'
import { publicSessionKeys } from './queryKeys'
/**
 * The signed-in Player for the session page's account bar (#693): `name`, `nickname`, `rtrId`,
 * `pictureUrl`. Mock mode only: in real mode the query stays disabled and the page reads the same
 * fields from `usePlayerSessionAccess` (the Player app's own sign-in).
 */
export function useSessionPageAccount(playerId: string | null | undefined) {
  return useQuery({
    queryKey: publicSessionKeys.account(playerId ?? ''),
    queryFn: () => getSessionPageAccount(playerId ?? ''),
    enabled: !!playerId && !isRealDataMode(),
  })
}
