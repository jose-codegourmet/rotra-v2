'use client'

import { cn } from '@rotra/ui/cn'
import { Icon, type IconName } from '@rotra/ui/icon'
import { useOptionalAppShell } from '../AppShell.context'

export type DockAction = {
  label: string
  icon: IconName
  onClick: () => void
  disabled?: boolean
  /** The end button's page is open */
  current?: boolean
}

export type BottomDockProps = {
  /** The highlighted centre button: Create session, Continue session, Start session, Session done */
  main: DockAction
  /** Right button, Settings in the Queue prototype */
  end: DockAction
}

/**
 * The Queue prototype's phone dock (900 px and below): Menu opens the navigation drawer, the main
 * session action sits in the centre within thumb reach, and Settings on the right.
 */
export function BottomDock({ main, end }: BottomDockProps) {
  const shell = useOptionalAppShell()
  const sideButton =
    'flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-md border-0 bg-transparent text-[11px] font-bold text-fg2 hover:text-accent'
  return (
    <nav
      aria-label="Quick actions"
      className={cn(
        'fixed inset-x-0 bottom-0 z-25 hidden grid-cols-[1fr_1.6fr_1fr] items-center gap-2 border-t border-border bg-surface/96 backdrop-blur-[10px]',
        'pt-2 pr-[max(12px,env(safe-area-inset-right,0px))] pb-[calc(8px+env(safe-area-inset-bottom,0px))] pl-[max(12px,env(safe-area-inset-left,0px))]',
        'max-[900px]:grid',
      )}
    >
      <button
        type="button"
        onClick={shell?.toggleNav}
        aria-controls="app-nav"
        aria-expanded={Boolean(shell?.drawerOpen)}
        className={sideButton}
      >
        <Icon name="menu" />
        <span>Menu</span>
      </button>
      <button
        type="button"
        onClick={main.onClick}
        disabled={main.disabled}
        className={cn(
          'flex min-h-12 items-center justify-center gap-2 rounded-full border-0 bg-accent text-sm font-extrabold text-on-accent',
          'shadow-[0_6px_18px_color-mix(in_srgb,var(--accent)_35%,transparent)] disabled:cursor-default disabled:opacity-50 disabled:shadow-none',
        )}
      >
        <Icon name={main.icon} />
        <span>{main.label}</span>
      </button>
      <button
        type="button"
        onClick={end.onClick}
        disabled={end.disabled}
        aria-current={end.current ? 'page' : undefined}
        className={cn(sideButton, end.current && 'text-accent')}
      >
        <Icon name={end.icon} />
        <span>{end.label}</span>
      </button>
    </nav>
  )
}
