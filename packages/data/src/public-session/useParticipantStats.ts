'use client'
import { useQuery } from '@tanstack/react-query'
import { getParticipantStats } from './fetchers'
import { publicSessionKeys } from './queryKeys'

/**
 * Stats · last 90 days on the session page's participant profile card (#731), for a signed-in
 * Player. Enabled only while the card for a registered participant (with an RTR ID) is open.
 */
export function useParticipantStats(
  rtrId: string | null | undefined,
  viewerPlayerId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: publicSessionKeys.participantStats(rtrId ?? '', viewerPlayerId ?? ''),
    queryFn: ({ signal }) => getParticipantStats(rtrId ?? '', viewerPlayerId ?? null, signal),
    enabled: enabled && !!rtrId,
    retry: false,
  })
}
