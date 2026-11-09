'use client'
import { useConfirmMockEmail } from '@rotra/data/player-account/useConfirmMockEmail'
import { useMyAccount } from '@rotra/data/player-account/useMyAccount'
import { useResendConfirmationEmail } from '@rotra/data/player-account/useResendConfirmationEmail'
import { isRealDataMode } from '@rotra/data/real/mode'
import { TopBar } from '@rotra/ui/app-shell/top-bar'
import { EmailConfirmBanner } from '@rotra/ui/email-confirm-banner'
import { OfflineBand } from '@rotra/ui/offline-band'
import { PlayerNav, type PlayerNavCurrent } from '@rotra/ui/player-nav'
import { ThemeToggle } from '@rotra/ui/theme-toggle'
import { toast } from '@rotra/ui/toaster'
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
  const myAccount = useMyAccount(account?.id ?? null)
  const resend = useResendConfirmationEmail()
  const confirm = useConfirmMockEmail()
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
      {myAccount.data?.emailConfirmedAt === null ? (
        <EmailConfirmBanner
          email={myAccount.data.email}
          pending={resend.isPending}
          resent={resend.isSuccess}
          error={resend.error?.message ?? confirm.error?.message}
          onResend={() =>
            resend.mutate(undefined, {
              onSuccess: () => toast('Email sent again'),
              onError: (error) => toast.error(error.message),
            })
          }
          onConfirm={
            !isRealDataMode()
              ? () =>
                  confirm.mutate(undefined, {
                    onSuccess: () => toast('Email confirmed'),
                    onError: (error) => toast.error(error.message),
                  })
              : undefined
          }
        />
      ) : null}
      {dev.offline && dev.offlineAt ? <OfflineBand savedAt={new Date(dev.offlineAt)} /> : null}
      {children}
    </>
  )
}
