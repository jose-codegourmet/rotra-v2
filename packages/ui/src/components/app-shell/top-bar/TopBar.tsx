'use client'

import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'
import { IconButton } from '@rotra/ui/icon-button'
import type { ReactNode } from 'react'
import { useOptionalAppShell } from '../AppShell.context'

export type TopBarProps = {
  /** Product name after the ROTRA mark: "Queue", "Admin" (hidden on phones ≤ 480 px) */
  product: string
  /** The mark becomes a button (Player and Admin go home from it) */
  onBrandClick?: () => void
  /** Right side: SyncStatus, ThemeToggle, account */
  children?: ReactNode
  /** Center the content at 1240 px like Queue; Admin's top bar spans the window */
  contained?: boolean
}

/** The prototypes' .top: sticky, blurred top bar with the menu button, the ROTRA mark and actions. */
export function TopBar({ product, onBrandClick, children, contained = true }: TopBarProps) {
  const shell = useOptionalAppShell()
  const showMenu = shell && !(shell.narrow && shell.hasDock)
  const menuLabel = shell?.narrow
    ? shell.drawerOpen
      ? 'Close menu'
      : 'Open menu'
    : shell?.collapsed
      ? 'Expand navigation'
      : 'Collapse navigation'

  const brand = (
    <>
      <span>
        ROTR<b className="text-accent">A</b>
      </span>
      <span className="text-sm font-semibold tracking-normal text-fg2 max-[480px]:hidden">
        {product}
      </span>
    </>
  )
  const brandClass = 'flex items-baseline gap-2 text-[17px] font-extrabold tracking-[1.5px]'

  return (
    <header className="sticky top-[env(safe-area-inset-top,0px)] z-20 border-b border-border bg-bg/92 backdrop-blur-[8px]">
      <div
        className={cn(
          'flex items-center gap-3 py-2.5 pr-[max(16px,env(safe-area-inset-right,0px))] pl-[max(16px,env(safe-area-inset-left,0px))] max-[480px]:gap-2',
          contained && 'mx-auto max-w-[1240px]',
        )}
      >
        {showMenu ? (
          <IconButton
            variant="ghost"
            size="xs"
            label={menuLabel}
            aria-controls="app-nav"
            aria-expanded={shell.narrow ? shell.drawerOpen : !shell.collapsed}
            onClick={shell.toggleNav}
            className="-ml-1.5"
          >
            <Icon name="menu" />
          </IconButton>
        ) : null}
        {onBrandClick ? (
          <button
            type="button"
            onClick={onBrandClick}
            aria-label={`ROTRA ${product}`}
            className={cn(brandClass, 'border-0 bg-transparent p-0')}
          >
            {brand}
          </button>
        ) : (
          <div role="img" aria-label={`ROTRA ${product}`} className={brandClass}>
            {brand}
          </div>
        )}
        <div className="flex-1" />
        {children}
      </div>
    </header>
  )
}
