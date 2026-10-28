'use client'
import { TopBar } from '@rotra/ui/app-shell/top-bar'
import { OfflineBand } from '@rotra/ui/offline-band'
import { PlayerNav, type PlayerNavCurrent } from '@rotra/ui/player-nav'
import { ThemeToggle } from '@rotra/ui/theme-toggle'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { DevTools } from '@/providers/DevTools'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { selectAccount } from '@/store/slices/authSlice'
import { selectDev } from '@/store/slices/devSlice'
import { requestLeave, selectUnsavedDraft } from '@/store/slices/uiSlice'

export function PlayerShell({ children }: { children: ReactNode }) {
  const account = useAppSelector(selectAccount)
  const dev = useAppSelector(selectDev)
  const pathname = usePathname()
  const router = useRouter()
  const dispatch = useAppDispatch()
  const unsavedDraft = useAppSelector(selectUnsavedDraft)
  // With unsaved edits open, leaving goes through the form's D-DISCARD instead of navigating.
  const target = (href: string) =>
    unsavedDraft ? { onNavigate: () => dispatch(requestLeave(href)) } : { href }
  const ownPath = account ? `/players/${account.id}` : null
  const current: PlayerNavCurrent =
    pathname === '/'
      ? 'leaderboard'
      : (ownPath && (pathname === ownPath || pathname.startsWith(`${ownPath}/`))) ||
          pathname === '/me' ||
          pathname.startsWith('/me/') ||
          pathname.startsWith('/profile/')
        ? 'profile'
        : ['/login', '/forgot-password'].includes(pathname) ||
            pathname.startsWith('/reset-password/')
          ? 'sign-in'
          : null
  return (
    <>
      <TopBar
        product="Players"
        onBrandClick={() => (unsavedDraft ? dispatch(requestLeave('/')) : router.push('/'))}
      >
        <PlayerNav
          signedIn={Boolean(account)}
          current={current}
          leaderboard={target('/')}
          profile={target(ownPath ?? '/')}
          signIn={target('/login')}
          linkAs={Link}
        />
        <ThemeToggle />
        {process.env.NODE_ENV !== 'production' ? <DevTools /> : null}
      </TopBar>
      {dev.offline && dev.offlineAt ? <OfflineBand savedAt={new Date(dev.offlineAt)} /> : null}
      {children}
    </>
  )
}
