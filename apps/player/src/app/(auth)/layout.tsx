import { AuthArtProvider } from '@rotra/ui/auth-art-provider'
import type { ReactNode } from 'react'

/** P-LOGIN, P-FORGOT, P-RESET and the invite and Google pages: Tara in a ready stance behind every card. */
export default function PlayerAuthLayout({ children }: { children: ReactNode }) {
  return <AuthArtProvider art="/art/auth/player-sign-in-tara.webp">{children}</AuthArtProvider>
}
