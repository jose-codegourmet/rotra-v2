import { AuthArtProvider } from '@rotra/ui/auth-art-provider'
import type { ReactNode } from 'react'

/** Q-LOGIN: Rion, the Queue Master, courtside behind the club login. */
export default function QueueAuthLayout({ children }: { children: ReactNode }) {
  return <AuthArtProvider art="/art/auth/queue-club-login-rion.webp">{children}</AuthArtProvider>
}
