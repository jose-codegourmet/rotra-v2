'use client'
import { useAdminConnectivity } from '@rotra/data/admin-account/use-admin-connectivity'
import { useAdminSession } from '@rotra/data/admin-account/use-admin-session'
import { useSignOutAdmin } from '@rotra/data/admin-account/use-sign-out-admin'
import { useAdminPlayers } from '@rotra/data/admin-player/useAdminPlayers'
import { useAdminClubs } from '@rotra/data/club/useAdminClubs'
import { useClubNameRequests } from '@rotra/data/club/useClubNameRequests'
import { useContactRequestCounts } from '@rotra/data/contact-change-request/useContactRequestCounts'
import { useFeatureFlags } from '@rotra/data/feature-flag/useFeatureFlags'
import { isPermissionRefusal } from '@rotra/data/mock/errors'
import { AccessDeniedCard } from '@rotra/ui/access-denied-card'
import { AdminAccountBadge } from '@rotra/ui/admin-account-badge'
import { AdminNav, type AdminNavKey } from '@rotra/ui/admin-nav'
import { AdminOfflineBand } from '@rotra/ui/admin-offline-band'
import { AppShell } from '@rotra/ui/app-shell'
import { TopBar } from '@rotra/ui/app-shell/top-bar'
import { ErrorState } from '@rotra/ui/error-state'
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
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { requestLeave, selectUnsavedDraft } from '@/store/slices/uiSlice'

const AdminWorkspaceAccess = createContext<(() => void) | null>(null)
export function useAdminWorkspaceAccess() {
  return useContext(AdminWorkspaceAccess)
}

const isPermissionError = isPermissionRefusal

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
  const players = useAdminPlayers({}, { enabled: isOwner })
  const nameRequests = useClubNameRequests({ enabled: isOwner })
  const contactRequests = useContactRequestCounts({ enabled: isOwner })
  const featureFlags = useFeatureFlags({ enabled: isOwner })
  const reportPermissionDenied = useCallback(() => {
    void client.cancelQueries()
    client.clear()
    setPermissionDenied(true)
  }, [client])
  const pathname = usePathname()
  const router = useRouter()
  const dispatch = useAppDispatch()
  const unsavedDraft = useAppSelector(selectUnsavedDraft)
  // With an unsaved draft open, leaving goes through the page's "Discard your draft?" instead of
  // navigating (rotra-admin.html go() with cfgDirty); the page continues the navigation on Discard.
  const leave = (href: string) => {
    if (href !== pathname) dispatch(requestLeave(href))
  }
  const handleSignOut = () =>
    signOut.mutate(undefined, {
      onSuccess: () => {
        router.replace('/login')
        router.refresh()
      },
    })
  const kind = session.data.kind
  // Only a signed-out session goes to sign-in. A denied account (signed in, but not an active admin,
  // e.g. a club signed in on another localhost port) and a failed session read stay here: the proxy
  // sees a provider session and would send /login straight back, leaving a blank page.
  useEffect(() => {
    if (!session.isPending && !session.isError && kind === 'signed-out') {
      router.replace('/login')
      router.refresh()
    }
  }, [kind, session.isPending, session.isError, router])
  const countsDenied =
    isPermissionError(clubs.error) ||
    isPermissionError(players.error) ||
    isPermissionError(nameRequests.error) ||
    isPermissionError(contactRequests.error) ||
    isPermissionError(featureFlags.error)
  useLayoutEffect(() => {
    if (countsDenied) reportPermissionDenied()
  }, [countsDenied, reportPermissionDenied])
  const topBar = (
    <TopBar product="Admin" width="window">
      <ThemeToggle />
    </TopBar>
  )
  if (permissionDenied || session.data.kind === 'denied')
    return (
      <>
        {topBar}
        <AccessDeniedCard
          accountDescription={
            session.data.kind === 'denied'
              ? session.data.accountDescription
              : 'the signed-in account'
          }
          isSigningOut={signOut.isPending}
          onSignOut={handleSignOut}
        />
      </>
    )
  if (session.isPending) return <Skeleton label="Loading Admin" />
  if (session.isError)
    return (
      <>
        {topBar}
        <main className="mx-auto max-w-[560px] px-4 pt-10">
          <ErrorState
            title="Couldn't check your sign-in."
            onRetry={() => void session.refetch()}
            retryLabel="Retry"
          >
            Check your connection, then try again.
          </ErrorState>
        </main>
      </>
    )
  if (session.data.kind !== 'owner') return <Skeleton label="Loading Admin" />
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
            width="window"
            menuOnNarrowOnly
            brandHref={unsavedDraft ? undefined : '/clubs'}
            onBrandClick={unsavedDraft ? () => leave('/clubs') : undefined}
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
          onNavigate={unsavedDraft ? leave : undefined}
          counts={{
            clubs: clubs.data?.counts.all,
            players: players.data?.counts.all,
            'contact-changes': contactRequests.data?.attention,
            'club-names': nameRequests.data?.pending.length,
            'feature-flags': featureFlags.data?.length,
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
