'use client'

import { ThemeProvider } from '@rotra/ui/theme-provider'
import type { ReactNode } from 'react'
import { THEME_STORAGE_KEY } from './themeStorageKey'

/** Every client-side provider the app needs, mounted once in the root layout. */
export function AppProviders({ children }: { children: ReactNode }) {
  return <ThemeProvider storageKey={THEME_STORAGE_KEY}>{children}</ThemeProvider>
}
