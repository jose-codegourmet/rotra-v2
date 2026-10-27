'use client'

import { cn } from '@rotra/ui/cn'
import { useMediaQuery } from '@rotra/ui/hooks/use-media-query'
import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { AppShellContext, type AppShellContextValue, useOptionalAppShell } from './AppShell.context'

/** At and below this width the rail becomes a drawer (the prototypes' 900 px breakpoint). */
export const NARROW_QUERY = '(max-width: 900px)'

/** Shell state for TopBar, SideRail and BottomDock. */
export function useAppShell() {
  const value = useOptionalAppShell()
  if (!value) throw new Error('useAppShell must be used inside <AppShell>')
  return value
}

export type AppShellProps = {
  /** A TopBar */
  topBar: ReactNode
  /** A SideRail */
  rail: ReactNode
  /** A BottomDock (Queue only); omit and the top bar's menu button opens the drawer on phones */
  dock?: ReactNode
  /** Rail collapsed to icons on wide screens; pass with onCollapsedChange to remember it per device */
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  /** Rail width when expanded: 232 px in Queue, 236 px in Admin */
  railWidth?: 232 | 236
  children: ReactNode
}

/**
 * The operator shell shared by Queue and Admin: a sticky top bar, a left rail that collapses to icons
 * on wide screens and becomes a drawer at 900 px and below, an optional phone dock, and the main
 * column. Only one drawer is open at a time; Escape or the scrim closes it.
 */
export function AppShell({
  topBar,
  rail,
  dock,
  collapsed: collapsedProp,
  onCollapsedChange,
  railWidth = 232,
  children,
}: AppShellProps) {
  const narrow = useMediaQuery(NARROW_QUERY)
  const [collapsedState, setCollapsedState] = useState(false)
  const collapsed = collapsedProp ?? collapsedState
  const [drawerOpen, setDrawerOpen] = useState(false)

  const setCollapsed = useCallback(
    (next: boolean) => {
      setCollapsedState(next)
      onCollapsedChange?.(next)
    },
    [onCollapsedChange],
  )

  const toggleNav = useCallback(() => {
    if (narrow) setDrawerOpen((open) => !open)
    else setCollapsed(!collapsed)
  }, [narrow, collapsed, setCollapsed])

  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  // The drawer only exists on narrow screens; widening the window closes it.
  useEffect(() => {
    if (!narrow) setDrawerOpen(false)
  }, [narrow])

  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  const value = useMemo<AppShellContextValue>(
    () => ({ narrow, collapsed, drawerOpen, hasDock: Boolean(dock), toggleNav, closeDrawer }),
    [narrow, collapsed, drawerOpen, dock, toggleNav, closeDrawer],
  )

  return (
    <AppShellContext.Provider value={value}>
      {topBar}
      <div
        style={
          { '--rail': collapsed ? '68px' : `${railWidth}px`, '--topbar': '57px' } as CSSProperties
        }
        className={cn(
          'grid grid-cols-[var(--rail)_minmax(0,1fr)] items-start',
          'max-[900px]:grid-cols-[minmax(0,1fr)]',
        )}
      >
        {rail}
        {drawerOpen ? (
          <div aria-hidden className="fixed inset-0 z-45 bg-scrim" onClick={closeDrawer} />
        ) : null}
        <div
          className={cn(
            'min-w-0',
            dock && 'max-[900px]:pb-[calc(72px+env(safe-area-inset-bottom,0px))]',
          )}
        >
          {children}
        </div>
        {dock}
      </div>
    </AppShellContext.Provider>
  )
}
