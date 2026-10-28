'use client'
import { useAdminSession } from '@rotra/data/admin-account/use-admin-session'
import { useSignOutAdmin } from '@rotra/data/admin-account/use-sign-out-admin'
import { AdminAccountBadge } from '@rotra/ui/admin-account-badge'
import { AdminNav, type AdminNavKey } from '@rotra/ui/admin-nav'
import { AdminOfflineBand } from '@rotra/ui/admin-offline-band'
import { AppShell } from '@rotra/ui/app-shell'
import { TopBar } from '@rotra/ui/app-shell/top-bar'
import { ThemeToggle } from '@rotra/ui/theme-toggle'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { type ReactNode, useEffect } from 'react'
import { useAppSelector } from '@/store/hooks'
import { selectDev } from '@/store/slices/devSlice'

const HREFS: Record<AdminNavKey, string> = {
  clubs: '/clubs', players: '/players',
  'contact-changes': '/requests/contact-changes', 'club-names': '/requests/club-names',
  ranking: '/settings/ranking', 'feature-flags': '/settings/feature-flags',
}

export function AdminWorkspaceShell({ children }: { children: ReactNode }) {
  const session = useAdminSession()
  const signOut = useSignOutAdmin()
  const { offline } = useAppSelector(selectDev)
  const pathname = usePathname()
  const router = useRouter()
  const kind = session.data.kind
  useEffect(() => {
    if (kind !== 'owner') { router.replace('/login'); router.refresh() }
  }, [kind, router])
  if (session.data.kind !== 'owner') return null
  const email = session.data.account.email
  const current = (Object.keys(HREFS) as AdminNavKey[]).find((key) => pathname === HREFS[key] || pathname.startsWith(`${HREFS[key]}/`)) ?? null
  return <AppShell
    railWidth={236}
    contentAs="main"
    contentClassName="mx-auto flex w-full max-w-[1180px] flex-col gap-5 px-4 pt-6 pb-[120px]"
    topBar={<>
      <TopBar product="Admin" contained={false} menuOnNarrowOnly brandHref="/clubs" linkAs={Link}>
        <AdminAccountBadge email={email} /><ThemeToggle />
      </TopBar>
      {offline && session.loadedAt ? <AdminOfflineBand loadedAt={session.loadedAt} /> : null}
    </>}
    rail={<AdminNav current={current} hrefs={HREFS} linkComponent={Link} accountEmail={email} isSigningOut={signOut.isPending} onSignOut={() => signOut.mutate(undefined, { onSuccess: () => { router.replace('/login'); router.refresh() } })} />}
  >{children}</AppShell>
}
