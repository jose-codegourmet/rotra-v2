import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'
import type { ElementType } from 'react'
import './PlayerNav.css'

export type PlayerNavCurrent = 'leaderboard' | 'profile' | 'sign-in' | 'settings' | null

export type PlayerNavTarget = {
  href?: string
  onNavigate?: () => void
}

export type PlayerNavSession = {
  label: 'Play' | 'Ready' | 'Next up'
  live: boolean
  href: string
  /** "Back to session: TITLE" when live, or "Incoming session: TITLE". */
  accessibleName: string
}

export type PlayerNavProps = {
  signedIn: boolean
  /** Current Player Information section, if one of the main navigation items is current. */
  current: PlayerNavCurrent
  leaderboard: PlayerNavTarget
  profile?: PlayerNavTarget
  signIn?: PlayerNavTarget
  /** Shown only for a signed-in player with an available session. */
  session?: PlayerNavSession
  /** Omit while the player has a live session or an incoming one today. */
  settings?: PlayerNavTarget
  /** Link component for internal href targets; apps pass next/link's Link. */
  linkAs?: ElementType
}

function navItems({ signedIn, leaderboard, profile, signIn, session, settings }: PlayerNavProps) {
  return [
    {
      label: 'Leaderboard',
      key: 'leaderboard' as const,
      target: leaderboard,
      icon: 'trophy' as const,
    },
    ...(signedIn && session ? [{ key: 'session' as const, session }] : []),
    signedIn
      ? { label: 'My profile', key: 'profile' as const, target: profile, icon: 'user' as const }
      : { label: 'Sign in', key: 'sign-in' as const, target: signIn, icon: 'user' as const },
    ...(signedIn && settings
      ? [{ label: 'Settings', key: 'settings' as const, target: settings, icon: 'nav-gear' as const }]
      : []),
  ]
}

function renderNavItems(props: PlayerNavProps, dock: boolean) {
  const { current, linkAs: Link = 'a' } = props
  return navItems(props).map((item) => {
    if (item.key === 'session') {
      const { accessibleName, href, label, live } = item.session
      return (
        <a
          key={item.key}
          href={href}
          aria-label={accessibleName}
          className={cn('player-nav-session', live && 'player-nav-session-live')}
        >
          <span className="player-nav-session-face">
            <span>{label}</span>
          </span>
        </a>
      )
    }

    const isCurrent = current === item.key
    const common = {
      'aria-current': isCurrent ? ('page' as const) : undefined,
      className: dock
        ? cn(
            'flex min-h-[52px] max-w-40 flex-1 flex-col items-center justify-center gap-0.5 rounded-md border-0 bg-transparent text-xs font-semibold text-fg2 no-underline',
            isCurrent && 'bg-accent-subtle text-accent',
          )
        : cn(
            'inline-flex min-h-9 items-center justify-center touch:min-h-12 rounded-md border-0 bg-transparent px-3 font-semibold whitespace-nowrap text-fg2',
            'hover:bg-surface hover:text-fg',
            isCurrent && 'bg-elev text-fg hover:bg-elev',
          ),
    }
    const content = dock ? (
      <>
        <Icon name={item.icon} size={22} />
        <span>{item.label}</span>
      </>
    ) : (
      item.label
    )
    return item.target?.href ? (
      <Link key={item.key} href={item.target.href} onClick={item.target.onNavigate} {...common}>
        {content}
      </Link>
    ) : (
      <button
        key={item.key}
        type="button"
        onClick={item.target?.onNavigate}
        disabled={!item.target?.onNavigate}
        {...common}
      >
        {content}
      </button>
    )
  })
}

/** Player Information's wide top-bar navigation. At 640 px and narrower, use PlayerNavDock. */
export function PlayerNav(props: PlayerNavProps) {
  return (
    <nav aria-label="Main" className="flex gap-0.5 max-[640px]:hidden sm:mr-auto sm:ml-2">
      {renderNavItems(props, false)}
    </nav>
  )
}

/**
 * Fixed phone navigation with safe-area padding and a spacer that keeps content above the dock.
 * Render it outside the top bar's backdrop blur. Hidden above 640 px.
 */
export function PlayerNavDock(props: PlayerNavProps) {
  return (
    <>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 hidden justify-center gap-1 border-t border-border bg-bg/92 pt-1.5 pr-[max(12px,env(safe-area-inset-right,0px))] pb-[calc(6px+env(safe-area-inset-bottom,0px))] pl-[max(12px,env(safe-area-inset-left,0px))] backdrop-blur-[8px] max-[640px]:flex"
      >
        {renderNavItems(props, true)}
      </nav>
      <div
        aria-hidden
        className="hidden h-[calc(68px+env(safe-area-inset-bottom,0px))] max-[640px]:block"
      />
    </>
  )
}
