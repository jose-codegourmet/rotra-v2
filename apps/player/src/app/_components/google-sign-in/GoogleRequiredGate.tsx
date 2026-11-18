'use client'
import { useGoogleDeadline } from '@rotra/data/google-sign-in/useGoogleDeadline'
import { useGoogleRequirement } from '@rotra/data/google-sign-in/useGoogleRequirement'
import { useMyAccount } from '@rotra/data/player-account/useMyAccount'
import { usePathname, useRouter } from 'next/navigation'
import { type ReactNode, useEffect } from 'react'

/** After the deadline a password-only player sees only P-GOOGLE-REQUIRED, the leaderboard and the legal pages. */
const ALLOWED = ['/', '/connect-google', '/privacy', '/terms']

/**
 * The deadline gate (D-2026-11-16-01). Mounted by the shell only while `player_google_sign_in` is on.
 * A signed-in player with no Google account, after the deadline, is sent to `/connect-google` from
 * every other page; their page isn't drawn meanwhile. Before the deadline, or with Google connected,
 * or while the facts are still loading and the deadline hasn't passed, it renders `children` as is.
 */
export function GoogleRequiredGate({
  playerId,
  children,
}: {
  playerId: string | null
  children: ReactNode
}) {
  const pathname = usePathname(),
    router = useRouter()
  const account = useMyAccount(playerId)
  const deadline = useGoogleDeadline().data
  const requirement = useGoogleRequirement(account.data)
  const outside = !ALLOWED.includes(pathname)
  const holding =
    Boolean(playerId) &&
    outside &&
    (requirement.state === 'required' || (deadline?.passed === true && account.isPending))
  useEffect(() => {
    if (holding && requirement.state === 'required') {
      router.replace(
        pathname === '/profile/verification'
          ? '/connect-google?returnTo=%2Fprofile%2Fverification'
          : '/connect-google',
      )
    }
  }, [holding, pathname, requirement.state, router])
  return holding ? null : children
}
