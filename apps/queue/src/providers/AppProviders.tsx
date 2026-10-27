'use client'

import { ThemeProvider } from '@rotra/ui/theme-provider'
import { Toaster, toast } from '@rotra/ui/toaster'
import type { ReactNode } from 'react'
import { AuthBridge } from './AuthBridge'
import { MockBridge } from './MockBridge'
import { QueryProvider } from './QueryProvider'
import { StoreProvider } from './StoreProvider'
import { THEME_STORAGE_KEY } from './themeStorageKey'

/** Every client-side provider the app needs, mounted once in the root layout. */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      storageKey={THEME_STORAGE_KEY}
      onThemeChange={(theme) => toast(theme === 'light' ? 'Light mode' : 'Dark mode')}
    >
      <StoreProvider>
        <QueryProvider>
          <AuthBridge />
          <MockBridge />
          {children}
          <Toaster />
        </QueryProvider>
      </StoreProvider>
    </ThemeProvider>
  )
}
