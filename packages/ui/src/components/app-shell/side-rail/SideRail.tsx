'use client'

import { cn } from '@rotra/ui/cn'
import { Icon, type IconName } from '@rotra/ui/icon'
import { type ElementType, type ReactNode, useEffect, useRef } from 'react'
import { useOptionalAppShell } from '../AppShell.context'

export type RailItem = {
  id: string
  label: string
  icon: IconName
  /** Muted number at the end, e.g. saved players */
  count?: number
  /** Admin: a count that waits on the owner (warn pill while above 0) */
  hot?: boolean
  /** The live session link: accent text and a pulsing icon */
  live?: boolean
  /** This is the current page */
  current?: boolean
  /** Navigates with linkAs (e.g. Next's Link) */
  href?: string
  /** Or reports the choice */
  onSelect?: () => void
}

export type RailGroup = {
  /** Small uppercase heading (Admin: "Requests", "Settings") */
  label?: string
  items: RailItem[]
}

export type SideRailProps = {
  groups: RailGroup[]
  /** Names the navigation landmark, e.g. "Club navigation" */
  'aria-label': string
  /** Bottom block (Admin: "Signed in as" and Sign out) */
  footer?: ReactNode
  /** Link component for items with href; defaults to <a> (pass next/link's Link in apps) */
  linkAs?: ElementType
}

/**
 * The prototypes' .rail: the left navigation. Icons only when the shell is collapsed; a drawer from
 * the left at 900 px and below, focused when it opens.
 */
export function SideRail({ groups, footer, linkAs: Link = 'a', ...aria }: SideRailProps) {
  const shell = useOptionalAppShell()
  const navRef = useRef<HTMLElement>(null)
  const collapsed = Boolean(shell?.collapsed) && !shell?.narrow
  const drawerClosed = Boolean(shell?.narrow) && !shell?.drawerOpen

  // Opening the drawer moves focus into it; closing returns focus to the button that opened it.
  const opener = useRef<HTMLElement | null>(null)
  const drawerOpen = Boolean(shell?.narrow && shell.drawerOpen)
  useEffect(() => {
    if (drawerOpen) {
      opener.current = document.activeElement as HTMLElement | null
      navRef.current?.querySelector<HTMLElement>('a, button')?.focus()
    } else if (opener.current) {
      opener.current.focus()
      opener.current = null
    }
  }, [drawerOpen])

  const itemClass = (item: RailItem) =>
    cn(
      'flex min-h-[42px] touch:min-h-12 w-full items-center gap-3 rounded-md border-0 bg-transparent px-3 py-[9px] text-left font-semibold whitespace-nowrap text-fg2 no-underline',
      'hover:bg-elev hover:text-fg',
      item.current && 'bg-accent-subtle text-accent hover:bg-accent-subtle hover:text-accent',
      item.live && 'text-accent',
      collapsed && 'justify-center px-0',
    )

  const content = (item: RailItem) => (
    <>
      <Icon
        name={item.icon}
        className={cn(
          'flex-none',
          item.live && 'animate-[pulse_1.6s_infinite] motion-reduce:animate-none',
        )}
      />
      <span className={cn(collapsed && 'hidden')}>{item.label}</span>
      {item.count !== undefined ? (
        <span
          className={cn(
            'ml-auto text-xs text-fg3 tabular-nums',
            item.hot && item.count > 0 && 'rounded-full bg-warn px-[7px] font-bold text-on-accent',
            collapsed && 'hidden',
          )}
        >
          {item.count}
        </span>
      ) : null}
    </>
  )

  return (
    <nav
      ref={navRef}
      id="app-nav"
      aria-label={aria['aria-label']}
      // Off-screen drawer links must not be reachable with Tab.
      inert={drawerClosed || undefined}
      className={cn(
        'sticky top-[calc(var(--topbar)+env(safe-area-inset-top,0px))] flex h-[calc(100dvh-var(--topbar)-env(safe-area-inset-top,0px))] flex-col gap-0.5 overflow-y-auto border-r border-border bg-surface px-2.5 py-3',
        'max-[900px]:fixed max-[900px]:top-0 max-[900px]:bottom-0 max-[900px]:left-0 max-[900px]:z-46 max-[900px]:h-auto max-[900px]:w-[min(280px,84vw)]',
        'max-[900px]:pt-[calc(16px+env(safe-area-inset-top,0px))] max-[900px]:shadow-drawer max-[900px]:transition-transform max-[900px]:duration-200 motion-reduce:transition-none',
        drawerClosed ? 'max-[900px]:-translate-x-[102%]' : 'max-[900px]:translate-x-0',
      )}
    >
      {groups.map((group, index) => (
        <div key={group.label ?? index} className="flex flex-col gap-0.5">
          {group.label && !collapsed ? (
            <span className="px-3 pt-3.5 pb-1 text-[11px] font-bold tracking-[0.6px] text-fg3 uppercase">
              {group.label}
            </span>
          ) : null}
          {group.items.map((item) => {
            const name = item.count !== undefined ? `${item.label}, ${item.count}` : item.label
            const common = {
              'aria-current': item.current ? ('page' as const) : undefined,
              'aria-label': name,
              title: item.label,
              className: itemClass(item),
            }
            return item.href ? (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => {
                  item.onSelect?.()
                  shell?.closeDrawer()
                }}
                {...common}
              >
                {content(item)}
              </Link>
            ) : (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  item.onSelect?.()
                  shell?.closeDrawer()
                }}
                {...common}
              >
                {content(item)}
              </button>
            )
          })}
        </div>
      ))}
      {footer ? (
        <div
          className={cn(
            'mt-auto flex flex-col gap-0.5 border-t border-border pt-3',
            collapsed && 'hidden',
          )}
        >
          {footer}
        </div>
      ) : null}
    </nav>
  )
}
