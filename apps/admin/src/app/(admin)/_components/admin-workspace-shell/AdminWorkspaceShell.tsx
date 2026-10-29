'use client'
import { useAdminConnectivity } from '@rotra/data/admin-account/use-admin-connectivity'
import { useAdminSession } from '@rotra/data/admin-account/use-admin-session'
import { useAdminClubs } from '@rotra/data/club/useAdminClubs'
import { useClubNameRequests } from '@rotra/data/club/useClubNameRequests'
import { useSignOutAdmin } from '@rotra/data/admin-account/use-sign-out-admin'
import { MockError } from '@rotra/data/mock/errors'
import { AccessDeniedCard } from '@rotra/ui/access-denied-card'
import { AdminAccountBadge } from '@rotra/ui/admin-account-badge'
import { AdminNav, type AdminNavKey } from '@rotra/ui/admin-nav'
import { AdminOfflineBand } from '@rotra/ui/admin-offline-band'
import { AppShell } from '@rotra/ui/app-shell'
import { TopBar } from '@rotra/ui/app-shell/top-bar'
import { Skeleton } from '@rotra/ui/skeleton'
import { ThemeToggle } from '@rotra/ui/theme-toggle'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from 'react'

const AdminWorkspaceAccess = createContext<(() => void) | null>(null)
export function useAdminWorkspaceAccess() {
  return useContext(AdminWorkspaceAccess)
}

const isPermissionError = (error: unknown) =>
  error instanceof MockError && error.kind === 'permission'

/**
 * A privileged read refused with a permission error replaces the whole workspace with the access
 * denial (and clears the cache), so no partial data stays on screen. Returns true while denied, so
 * the caller renders nothing meanwhile.
 */
export function useDenyOnPermissionError(...errors: unknown[]) {
  const reportPermissionDenied = useAdminWorkspaceAccess()
  const denied = errors.some(isPermissionError)
  useLayoutEffect(() => {
    if (denied) reportPermissionDenied?.()
  }, [denied, reportPermissionDenied])
  return denied
}

const HREFS: Record<AdminNavKey, string> = {
  clubs: '/clubs',
  players: '/players',
  'contact-changes': '/requests/contact-changes',
  'club-names': '/requests/club-names',
  ranking: '/settings/ranking',
  'feature-flags': '/settings/feature-flags',
}

export function AdminWorkspaceShell({ children }: { children: ReactNode }) {
  const session = useAdminSession()
  const signOut = useSignOutAdmin()
  const { offline } = useAdminConnectivity()
  const client = useQueryClient()
  const [permissionDenied, setPermissionDenied] = useState(false)
  // Nav counts are privileged reads: they wait until the session is confirmed as the platform owner,
  // and stop once access has been denied.
  const isOwner = !session.isPending && session.data.kind === 'owner' && !permissionDenied
  const clubs = useAdminClubs({}, { enabled: isOwner })
  const nameRequests = useClubNameRequests({ enabled: isOwner })
  const reportPermissionDenied = useCallback(() => {
    void client.cancelQueries()
    client.clear()
    setPermissionDenied(true)
  }, [client])
  const pathname = usePathname()
  const router = useRouter()
  const handleSignOut = () =>
    signOut.mutate(undefined, {
      onSuccess: () => {
        router.replace('/login')
        router.refresh()
      },
    })
  const kind = session.data.kind
  useEffect(() => {
    if (!session.isPending && kind !== 'owner') {
      router.replace('/login')
      router.refresh()
    }
  }, [kind, session.isPending, router])
  const countsDenied = isPermissionError(clubs.error) || isPermissionError(nameRequests.error)
  useLayoutEffect(() => {
    if (countsDenied) reportPermissionDenied()
  }, [countsDenied, reportPermissionDenied])
  if (permissionDenied)
    return (
      <>
        <TopBar product="Admin" contained={false}>
          <ThemeToggle />
        </TopBar>
        <AccessDeniedCard
          accountDescription="the signed-in account"
          isSigningOut={signOut.isPending}
          onSignOut={handleSignOut}
        />
      </>
    )
  if (session.isPending) return <Skeleton label="Loading Admin" />
  if (session.data.kind !== 'owner') return null
  const email = session.data.account.email
  const current =
    (Object.keys(HREFS) as AdminNavKey[]).find(
      (key) => pathname === HREFS[key] || pathname.startsWith(`${HREFS[key]}/`),
    ) ?? null
  return (
    <AppShell
      railWidth={236}
      contentAs="main"
      contentClassName="mx-auto flex w-full max-w-[1180px] flex-col gap-5 px-4 pt-6 pb-[120px]"
      topBar={
        <>
          <TopBar
            product="Admin"
            contained={false}
            menuOnNarrowOnly
            brandHref="/clubs"
            linkAs={Link}
          >
            <AdminAccountBadge
              email={email}
              onSignOut={handleSignOut}
              isSigningOut={signOut.isPending}
            />
            <ThemeToggle />
          </TopBar>
          {offline && session.loadedAt ? <AdminOfflineBand loadedAt={session.loadedAt} /> : null}
        </>
      }
      rail={
        <AdminNav
          current={current}
          hrefs={HREFS}
          linkComponent={Link}
          counts={{
            clubs: clubs.data?.counts.all,
            'club-names': nameRequests.data?.pending.length,
          }}
          accountEmail={email}
          isSigningOut={signOut.isPending}
          onSignOut={handleSignOut}
        />
      }
    >
      <AdminWorkspaceAccess.Provider value={reportPermissionDenied}>
        {children}
      </AdminWorkspaceAccess.Provider>
    </AppShell>
  )
}
