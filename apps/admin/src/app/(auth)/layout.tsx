import { TopBar } from '@rotra/ui/app-shell/top-bar'
import { ThemeToggle } from '@rotra/ui/theme-toggle'
import type { ReactNode } from 'react'

export default function AdminAuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <TopBar product="Admin" width="window">
        <ThemeToggle />
      </TopBar>
      {children}
    </>
  )
}
