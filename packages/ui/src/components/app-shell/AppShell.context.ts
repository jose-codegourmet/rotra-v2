'use client'

import { createContext, useContext } from 'react'

export type AppShellContextValue = {
  /** Window is 900 px or narrower: the rail is a drawer */
  narrow: boolean
  /** Wide screens: the rail shows icons only */
  collapsed: boolean
  /** Narrow screens: the drawer is open */
  drawerOpen: boolean
  /** The shell has a bottom dock, so the top bar hides its menu button on narrow screens */
  hasDock: boolean
  /** Burger and dock Menu: collapses the rail on wide screens, opens or closes the drawer on narrow ones */
  toggleNav: () => void
  closeDrawer: () => void
}

export const AppShellContext = createContext<AppShellContextValue | null>(null)

/** Shell state for TopBar, SideRail and BottomDock; null outside an AppShell (sign-in, public pages). */
export function useOptionalAppShell() {
  return useContext(AppShellContext)
}
