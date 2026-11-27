import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { fontVariables } from './fonts'
import './globals.css'

export const metadata: Metadata = {
  title: 'ROTRA · Badminton player ranking',
  appleWebApp: { capable: true, title: 'ROTRA', statusBarStyle: 'black' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0b0b0c',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // suppressHydrationWarning: SiteBoot's inline script may add the no-boot class before hydration
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
