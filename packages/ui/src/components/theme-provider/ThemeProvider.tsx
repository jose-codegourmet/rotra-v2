'use client'

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from 'react'

export type Theme = 'dark' | 'light'

type ThemeContextValue = {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const readTheme = (): Theme =>
  document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'

// <html data-theme> is the source of truth: the theme script sets it before paint, and anything else
// that changes it (another provider, the Storybook toolbar) is picked up through the observer.
const subscribe = (onChange: () => void) => {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  return () => observer.disconnect()
}

export type ThemeProviderProps = {
  /** localStorage key that remembers the choice on this device, e.g. `rotra-queue-theme` */
  storageKey: string
  /** Called after the viewer changes the theme (the prototypes toast "Light mode" / "Dark mode") */
  onThemeChange?: (theme: Theme) => void
  children: ReactNode
}

/** Sets <html data-theme>, defaults to dark, and remembers the viewer's choice per device. */
export function ThemeProvider({ storageKey, onThemeChange, children }: ThemeProviderProps) {
  const theme = useSyncExternalStore<Theme>(subscribe, readTheme, () => 'dark')

  const setTheme = useCallback(
    (next: Theme) => {
      document.documentElement.dataset.theme = next
      try {
        localStorage.setItem(storageKey, next)
      } catch {
        // No storage (private mode, blocked): keep the choice for this visit only
      }
      onThemeChange?.(next)
    },
    [storageKey, onThemeChange],
  )

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
    }),
    [theme, setTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

/** The current theme and setters. Must be inside a ThemeProvider. */
export function useTheme() {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme must be used inside <ThemeProvider>')
  return value
}
