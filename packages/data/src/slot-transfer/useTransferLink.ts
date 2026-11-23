'use client'
import { useQuery } from '@tanstack/react-query'
import { publicSessionKeys } from '../public-session/queryKeys'
import { readTransferLink } from './playerTransfers'
import { isTransferLinkToken } from './slotTransfer.rules'
/**
 * The transfer link card (#1012) for `?transfer=<token>`: `data: TransferLinkView` (`state`,
 * the sender's masked name, `claimBlock`). `playerId` is the signed-in viewer in mock mode; real mode
 * reads the Player app's own sign-in. Every player write refetches it.
 */
export function useTransferLink(slug: string, token: string | undefined, playerId: string | null) {
  return useQuery({
    queryKey: publicSessionKeys.transferLink(slug, token ?? '', playerId ?? ''),
    queryFn: () => readTransferLink(slug, { token: token ?? '', playerId }),
    enabled: slug !== '' && isTransferLinkToken(token),
    refetchOnWindowFocus: true,
  })
}
