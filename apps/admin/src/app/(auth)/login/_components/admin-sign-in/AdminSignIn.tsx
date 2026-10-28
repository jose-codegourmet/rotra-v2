'use client'
import { useAdminConnectivity } from '@rotra/data/admin-account/use-admin-connectivity'
import { AuthCard } from '@rotra/ui/auth-card'
import { ErrorState } from '@rotra/ui/error-state'
import { Skeleton } from '@rotra/ui/skeleton'
import { useAdminSession } from '@rotra/data/admin-account/use-admin-session'
import { useSignInAdmin } from '@rotra/data/admin-account/use-sign-in-admin'
import { useSignOutAdmin } from '@rotra/data/admin-account/use-sign-out-admin'
import { AccessDeniedCard } from '@rotra/ui/access-denied-card'
import { AdminSignInForm } from '@rotra/ui/admin-sign-in-form'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function AdminSignIn() {
  const session = useAdminSession()
  const { offline } = useAdminConnectivity()
  const signIn = useSignInAdmin()
  const signOut = useSignOutAdmin()
  const router = useRouter()
  const kind = session.data.kind
  useEffect(() => { if (!session.isPending && kind === 'owner') router.replace('/clubs') }, [kind, session.isPending, router])
  if (session.isPending) return <AuthCard title="Sign in" product="Admin"><Skeleton label="Loading sign-in" className="h-11" /><Skeleton className="h-11" /></AuthCard>
  if (session.isError) return <AuthCard title="Sign in" product="Admin"><ErrorState title="Couldn't load your session." onRetry={() => void session.refetch()} retryLabel="Retry">Check your connection, then try again.</ErrorState></AuthCard>
  if (session.data.kind === 'owner') return null
  if (session.data.kind === 'denied') {
    return <AccessDeniedCard accountDescription={session.data.accountDescription} isSigningOut={signOut.isPending} onSignOut={() => signOut.mutate(undefined, { onSuccess: () => { router.replace('/login'); router.refresh() } })} />
  }
  return <AdminSignInForm
    isPending={signIn.isPending}
    sessionEnded={session.data.sessionEnded}
    serverError={offline ? 'Signing in needs an internet connection.' : signIn.error?.message}
    onSubmit={async (values) => {
      try { await signIn.mutateAsync(values) } catch { /* The form displays the mutation error and keeps the inputs. */ }
    }}
  />
}
