import { cn } from '@rotra/ui/cn'
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

/** The two-item Player Information navigation from the player prototype's top bar. */
export function PlayerNav({
  signedIn,
  current,
  leaderboard,
  profile,
  signIn,
  linkAs: Link = 'a',
}: PlayerNavProps) {
  const second = signedIn
    ? { label: 'My profile', key: 'profile' as const, target: profile }
    : { label: 'Sign in', key: 'sign-in' as const, target: signIn }
  const items = [{ label: 'Leaderboard', key: 'leaderboard' as const, target: leaderboard }, second]

  return (
    <nav
      aria-label="Main"
      className="order-5 flex w-full gap-0.5 max-[560px]:mt-1 sm:order-none sm:ml-2 sm:w-auto"
    >
      {items.map((item) => {
        const common = {
          'aria-current': current === item.key ? ('page' as const) : undefined,
          className: cn(
            'min-h-9 flex-1 rounded-md border-0 bg-transparent px-3 font-semibold whitespace-nowrap text-fg2',
            'hover:bg-surface hover:text-fg sm:flex-none',
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
