'use client'
import { playerSessionSlot } from '@rotra/data/player/rules'
import { useMySessions } from '@rotra/data/player/useMySessions'
import { useConfirmMockEmail } from '@rotra/data/player-account/useConfirmMockEmail'
import { useMyAccount } from '@rotra/data/player-account/useMyAccount'
import { useResendConfirmationEmail } from '@rotra/data/player-account/useResendConfirmationEmail'
import { usePlayerNotificationUnreadCount } from '@rotra/data/player-notifications/usePlayerNotifications'
import { isRealDataMode } from '@rotra/data/real/mode'
import { TopBar } from '@rotra/ui/app-shell/top-bar'
import { EmailConfirmBanner } from '@rotra/ui/email-confirm-banner'
import { NotificationBell } from '@rotra/ui/notification-bell'
import { OfflineBand } from '@rotra/ui/offline-band'
import {
  PlayerNav,
  type PlayerNavCurrent,
  PlayerNavDock,
  type PlayerNavProps,
} from '@rotra/ui/player-nav'
import { ThemeToggle } from '@rotra/ui/theme-toggle'
import { toast } from '@rotra/ui/toaster'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { DevTools } from '@/providers/DevTools'
import { usePlayerGoogleSignInEnabled } from '@/providers/PlayerFlagsProvider'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { selectAccount } from '@/store/slices/authSlice'
import { selectDev } from '@/store/slices/devSlice'
import {
  requestLeave,
  selectOnboardingFullscreen,
  selectUnsavedDraft,
} from '@/store/slices/uiSlice'
import { GoogleAnnouncementBand } from '../google-sign-in/GoogleAnnouncementBand'
import { GoogleRequiredGate } from '../google-sign-in/GoogleRequiredGate'

const SESSION_SLOT_LABELS = { play: 'Play', ready: 'Ready', 'next-up': 'Next up' } as const

export function PlayerShell({ children }: { children: ReactNode }) {
  const account = useAppSelector(selectAccount)
  const realMode = isRealDataMode()
  const mySessions = useMySessions(realMode ? (account?.id ?? null) : null, {
    refreshSessionSlot: true,
  })
  const unreadNotifications = usePlayerNotificationUnreadCount(account?.id ?? null)
  const myAccount = useMyAccount(account?.id ?? null)
  const resend = useResendConfirmationEmail()
  const confirm = useConfirmMockEmail()
  const dev = useAppSelector(selectDev)
  const pathname = usePathname()
  const router = useRouter()
  const dispatch = useAppDispatch()
  const unsavedDraft = useAppSelector(selectUnsavedDraft)
  const onboardingFullscreen = useAppSelector(selectOnboardingFullscreen)
  const googleSignIn = usePlayerGoogleSignInEnabled()
  // With unsaved edits open, leaving goes through the form's D-DISCARD instead of navigating.
  const target = (href: string) =>
    unsavedDraft ? { onNavigate: () => dispatch(requestLeave(href)) } : { href }
  const ownPath = account ? `/players/${account.id}` : null
  let current: PlayerNavCurrent = null
  if (pathname === '/') current = 'leaderboard'
  else if (pathname === '/settings') current = 'settings'
  else if (
    (ownPath && (pathname === ownPath || pathname.startsWith(`${ownPath}/`))) ||
    pathname === '/me' ||
    pathname.startsWith('/me/') ||
    pathname.startsWith('/profile/')
  ) {
    current = 'profile'
  } else if (
    ['/login', '/forgot-password'].includes(pathname) ||
    pathname.startsWith('/reset-password/')
  ) {
    current = 'sign-in'
  }
  // /card/<RTR ID> is framed by rotra.club: the card alone, no top bar or bands.
  // /s/<slug> is the public session page (D-2026-11-28-01): it keeps its own account bar, as it
  // looked on the Queue app, with no Player top bar, nav or bands.
  if (pathname.startsWith('/card/') || pathname.startsWith('/s/')) return <>{children}</>
  const slot =
    realMode && mySessions.data ? playerSessionSlot(mySessions.data.sessions, Date.now()) : null
  const nav: PlayerNavProps = {
    signedIn: Boolean(account),
    current,
    leaderboard: target('/'),
    profile: target(ownPath ?? '/'),
    signIn: target('/login'),
    session: slot
      ? {
          label: SESSION_SLOT_LABELS[slot.kind],
          live: slot.kind === 'play',
          href: slot.session.href,
          accessibleName: `${slot.kind === 'play' ? 'Back to session' : 'Incoming session'}: ${slot.session.title}`,
        }
      : undefined,
    settings: (slot?.showSettings ?? true) ? target('/settings') : undefined,
    linkAs: Link,
  }
  // P-ONBOARD is fullscreen: the frame draws its own header and footer, so no top bar, band or dock.
  // The children keep their place in the tree, so the onboarding's state survives the switch.
  const chrome = !onboardingFullscreen
  return (
    <>
      {chrome ? (
        <TopBar
          product="Players"
          onBrandClick={() => {
            // P-HOME: the logo is Home when signed in; visitors keep the leaderboard.
            const home = account ? '/home' : '/'
            if (unsavedDraft) dispatch(requestLeave(home))
            else router.push(home)
          }}
        >
          <PlayerNav {...nav} />
          {account ? (
            <NotificationBell
              unreadCount={unreadNotifications.isSuccess ? unreadNotifications.data : 0}
              current={pathname === '/notifications'}
              linkAs={Link}
              {...target('/notifications')}
            />
          ) : null}
          <ThemeToggle />
          {process.env.NODE_ENV !== 'production' ? <DevTools /> : null}
        </TopBar>
      ) : null}
      {chrome && myAccount.data?.emailConfirmedAt === null ? (
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
            !realMode
              ? () =>
                  confirm.mutate(undefined, {
                    onSuccess: () => toast('Email confirmed'),
                    onError: (error) => toast.error(error.message),
                  })
              : undefined
          }
        />
      ) : null}
      {chrome && googleSignIn && account && pathname !== '/connect-google' ? (
        <GoogleAnnouncementBand playerId={account.id} name={account.name} />
      ) : null}
      {chrome && dev.offline && dev.offlineAt ? (
        <OfflineBand savedAt={new Date(dev.offlineAt)} />
      ) : null}
      {googleSignIn ? (
        <GoogleRequiredGate playerId={account?.id ?? null}>{children}</GoogleRequiredGate>
      ) : (
        children
      )}
      {chrome ? <PlayerNavDock {...nav} /> : null}
    </>
  )
}
