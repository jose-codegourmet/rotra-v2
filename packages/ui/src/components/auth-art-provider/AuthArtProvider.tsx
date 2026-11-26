'use client'

import { createContext, type ReactNode, useContext } from 'react'

const AuthArtContext = createContext<string | undefined>(undefined)

export type AuthArtProviderProps = {
  /** Public path of the app's auth background art, e.g. "/art/auth/queue-club-login-rion.webp" */
  art: string
  children: ReactNode
}

/**
 * Gives every AuthCard below it the app's full-bleed background art, so an app's `(auth)/layout.tsx`
 * sets it once for the sign-in, recovery, invite and Google pages. It renders no element of its own.
 */
export function AuthArtProvider({ art, children }: AuthArtProviderProps) {
  return <AuthArtContext.Provider value={art}>{children}</AuthArtContext.Provider>
}

/** The art an enclosing AuthArtProvider set, if any. */
export function useAuthArt() {
  return useContext(AuthArtContext)
}
