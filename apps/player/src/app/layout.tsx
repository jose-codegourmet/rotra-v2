import { getThemeScript } from '@rotra/ui/theme-provider/script'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { AppProviders } from '@/providers/AppProviders'
import { THEME_STORAGE_KEY } from '@/providers/themeStorageKey'
import { fontVariables } from './fonts'
import './globals.css'

export const metadata: Metadata = {
  title: 'ROTRA Player Information',
  description: 'Player profiles, shared rank and the leaderboard.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // suppressHydrationWarning: the theme script may switch data-theme before React hydrates
    <html lang="en" data-theme="dark" className={fontVariables} suppressHydrationWarning>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: fixed script from @rotra/ui; applies the remembered theme before first paint */}
        <script dangerouslySetInnerHTML={{ __html: getThemeScript(THEME_STORAGE_KEY) }} />
      </head>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
