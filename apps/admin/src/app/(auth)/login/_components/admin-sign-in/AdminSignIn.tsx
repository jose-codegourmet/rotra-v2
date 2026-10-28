'use client'
import { useAdminSession } from '@rotra/data/admin-account/use-admin-session'
import { useSignInAdmin } from '@rotra/data/admin-account/use-sign-in-admin'
import { useSignOutAdmin } from '@rotra/data/admin-account/use-sign-out-admin'
import { AccessDeniedCard } from '@rotra/ui/access-denied-card'
import { AdminSignInForm } from '@rotra/ui/admin-sign-in-form'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function AdminSignIn() {
  const session = useAdminSession()
  const signIn = useSignInAdmin()
  const signOut = useSignOutAdmin()
  const router = useRouter()
  const kind = session.data.kind
  useEffect(() => { if (kind === 'owner') router.replace('/clubs') }, [kind, router])
  if (kind === 'owner') return null
  if (session.data.kind === 'denied') {
    return <AccessDeniedCard accountDescription={session.data.accountDescription} isSigningOut={signOut.isPending} onSignOut={() => signOut.mutate(undefined, { onSuccess: () => { router.replace('/login'); router.refresh() } })} />
  }
  return <AdminSignInForm
    isPending={signIn.isPending}
    sessionEnded={session.data.sessionEnded}
    serverError={signIn.error?.message}
    onSubmit={async (values) => {
      try { await signIn.mutateAsync(values) } catch { /* The form displays the mutation error and keeps the inputs. */ }
    }}
  />
}
