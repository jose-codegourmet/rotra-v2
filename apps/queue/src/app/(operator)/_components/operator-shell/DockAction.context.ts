'use client'

import type { DockAction } from '@rotra/ui/app-shell/bottom-dock'
import { createContext, useContext, useEffect } from 'react'

export type OperatorShellContextValue = {
  /** A page overrides the dock's centre pill (Session done, Start session); null restores the default */
  setDockAction: (action: DockAction | null) => void
  /** The Club settings drawer on phones; only one drawer (main nav or settings) is open at a time */
  settingsMenuOpen: boolean
  setSettingsMenuOpen: (open: boolean) => void
}

export const OperatorShellContext = createContext<OperatorShellContextValue | null>(null)

export function useOperatorShell() {
  const value = useContext(OperatorShellContext)
  if (!value) throw new Error('useOperatorShell must be used inside OperatorShell')
  return value
}

/** Lets a page own the dock's centre pill while it is mounted. */
export function useDockAction(action: DockAction | null) {
  const { setDockAction } = useOperatorShell()
  useEffect(() => {
    setDockAction(action)
    return () => setDockAction(null)
  }, [action, setDockAction])
}
