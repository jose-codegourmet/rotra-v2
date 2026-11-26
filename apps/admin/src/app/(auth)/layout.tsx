import { TopBar } from '@rotra/ui/app-shell/top-bar'
import { AuthArtProvider } from '@rotra/ui/auth-art-provider'
import { ThemeToggle } from '@rotra/ui/theme-toggle'
import type { ReactNode } from 'react'

export default function AdminAuthLayout({ children }: { children: ReactNode }) {
  return (
    <AuthArtProvider art="/art/auth/admin-sign-in-arena.webp">
      <TopBar product="Admin" width="window">
        <ThemeToggle />
      </TopBar>
      {children}
    </AuthArtProvider>
  )
}
