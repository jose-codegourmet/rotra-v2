'use client'
import { useQuery } from '@tanstack/react-query'
import { getSessionInviteCode } from './playerMutations'
import { publicSessionKeys } from './queryKeys'
/**
 * Session invite (D-2026-11-09-08): this Player's random 8-character code for the session, made the
 * first time and the same on every later read; link it as `?invite=<code>`. Enable it when the
 * Invite sheet opens. Errors (permission) once the session is not Prepared, or for a Player with
 * no slot or waitlist place.
 */
export function useSessionInviteCode(slug: string, playerId: string, enabled = true) {
  return useQuery({
    queryKey: publicSessionKeys.inviteCode(slug, playerId),
    queryFn: () => getSessionInviteCode(slug, { playerId }),
    enabled: enabled && slug !== '' && playerId !== '',
    retry: false,
  })
}
