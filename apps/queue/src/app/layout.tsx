import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { fontVariables } from './fonts'
import './globals.css'

export const metadata: Metadata = {
  title: 'ROTRA Queue',
  description: 'Run the game: club sessions, courts and the shared queue.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className={fontVariables}>
      <body>{children}</body>
    </html>
  )
}
