'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { signOut } from '../auth/fetchers'
import { authKeys } from '../auth/queryKeys'
import { isRealDataMode } from '../real/mode'
import { realSignOutOnSessionPage } from '../real/public-session'
import { publicSessionKeys } from './queryKeys'

/**
 * **Sign out** in the session page's account bar (#693): signs the Player out of ROTRA Player on
 * this device (mock: the mock Player sign-out; real: the Player app's sign-out route), then the
 * page shows the visitor view. A join request already sent stays sent. Toast: “Signed out”.
 */
export function useSessionPageSignOut(slug: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: () => (isRealDataMode() ? realSignOutOnSessionPage(slug) : signOut('player')),
    onSuccess: async () => {
      client.setQueryData(authKeys.session('player'), null)
      // The Player-hosted read answers "signed out" straight away, then checks again.
      client.setQueryData(['player-session-access', slug], null)
      client.removeQueries({ queryKey: ['public-session', 'account'] })
      await client.invalidateQueries({ queryKey: ['player-session-access', slug] })
      await client.invalidateQueries({ queryKey: publicSessionKeys.myRequest(slug) })
    },
  })
}
