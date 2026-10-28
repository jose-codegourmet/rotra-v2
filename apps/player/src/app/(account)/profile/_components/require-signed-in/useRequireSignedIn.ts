'use client'
import { useSession } from '@rotra/data/auth/use-session'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'

/**
 * The container half of the /profile/* guard (proxy.ts is the other): once the session check says
 * signed out, go to sign-in with returnTo before any private value renders.
 */
export function useRequireSignedIn() {
  const session = useSession('player')
  const router = useRouter()
  const path = usePathname()
  const signedOut = session.isSuccess && !session.data
  useEffect(() => {
    if (signedOut) router.replace(`/login?returnTo=${encodeURIComponent(path)}`)
  }, [signedOut, router, path])
  return signedOut
}
