import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'
import type { ElementType } from 'react'

export type PlayerNavCurrent = 'leaderboard' | 'profile' | 'sign-in' | null

export type PlayerNavTarget = {
  href?: string
  onNavigate?: () => void
}

export type PlayerNavProps = {
  /** Whether the second item should lead to the player's profile instead of sign-in. */
  signedIn: boolean
  /** Current Player Information section, if one of the main navigation items is current. */
  current: PlayerNavCurrent
  leaderboard: PlayerNavTarget
  profile?: PlayerNavTarget
  signIn?: PlayerNavTarget
  /** Link component for href targets; apps pass next/link's Link. */
  linkAs?: ElementType
}

function navItems({ signedIn, leaderboard, profile, signIn }: PlayerNavProps) {
  const second = signedIn
    ? { label: 'My profile', key: 'profile' as const, target: profile, icon: 'user' as const }
    : { label: 'Sign in', key: 'sign-in' as const, target: signIn, icon: 'user' as const }
  return [
    {
      label: 'Leaderboard',
      key: 'leaderboard' as const,
      target: leaderboard,
      icon: 'trophy' as const,
    },
    second,
  ]
}

/**
 * The two-item Player Information navigation from the player prototype's top bar. At 640 px and
 * narrower it is hidden: render PlayerNavDock (outside the top bar) for the phone dock.
 */
export function PlayerNav(props: PlayerNavProps) {
  const { current, linkAs: Link = 'a' } = props
  const items = navItems(props)

  return (
    <nav aria-label="Main" className="flex gap-0.5 max-[640px]:hidden sm:mr-auto sm:ml-2">
      {items.map((item) => {
        const common = {
          'aria-current': current === item.key ? ('page' as const) : undefined,
          className: cn(
            'inline-flex min-h-9 items-center justify-center touch:min-h-12 rounded-md border-0 bg-transparent px-3 font-semibold whitespace-nowrap text-fg2',
            'hover:bg-surface hover:text-fg',
            current === item.key && 'bg-elev text-fg hover:bg-elev',
          ),
        }
        return item.target?.href ? (
          <Link key={item.key} href={item.target.href} onClick={item.target.onNavigate} {...common}>
            {item.label}
          </Link>
        ) : (
          <button
            key={item.key}
            type="button"
            onClick={item.target?.onNavigate}
            disabled={!item.target?.onNavigate}
            {...common}
          >
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}

/**
 * The phone bottom dock (640 px and narrower): Leaderboard and My profile / Sign in with an icon
 * and the label under it, the current page in the accent. Fixed to the bottom with safe-area
 * padding; the spacer after it keeps page content from hiding underneath. Render it outside the
 * top bar (the bar's backdrop blur would otherwise trap the fixed position). Hidden on wider screens.
 */
export function PlayerNavDock(props: PlayerNavProps) {
  const { current, linkAs: Link = 'a' } = props
  const items = navItems(props)
  return (
    <>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 hidden justify-center gap-1 border-t border-border bg-bg/92 pt-1.5 pr-[max(12px,env(safe-area-inset-right,0px))] pb-[calc(6px+env(safe-area-inset-bottom,0px))] pl-[max(12px,env(safe-area-inset-left,0px))] backdrop-blur-[8px] max-[640px]:flex"
      >
        {items.map((item) => {
          const isCurrent = current === item.key
          const common = {
            'aria-current': isCurrent ? ('page' as const) : undefined,
            className: cn(
              'flex min-h-[52px] max-w-40 flex-1 flex-col items-center justify-center gap-0.5 rounded-md border-0 bg-transparent text-xs font-semibold text-fg2 no-underline',
              isCurrent && 'bg-accent-subtle text-accent',
            ),
          }
          const content = (
            <>
              <Icon name={item.icon} size={22} />
              <span>{item.label}</span>
            </>
          )
          return item.target?.href ? (
            <Link
              key={item.key}
              href={item.target.href}
              onClick={item.target.onNavigate}
              {...common}
            >
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
        })}
      </nav>
      <div
        aria-hidden
        className="hidden h-[calc(68px+env(safe-area-inset-bottom,0px))] max-[640px]:block"
      />
    </>
  )
}
