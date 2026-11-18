'use client'

import { PLAYER_GOOGLE_SIGN_IN_FLAG } from '@rotra/data/feature-flag/keys'
import { isMockFlagForcedOn } from '@rotra/data/feature-flag/mock-override'
import { mockStore } from '@rotra/data/mock/store'
import { isRealDataMode } from '@rotra/data/real/mode'
import { createContext, type ReactNode, useContext, useSyncExternalStore } from 'react'

/** The server's read of `player_google_sign_in`, made before the page rendered. */
const GoogleSignInContext = createContext(false)

export function PlayerFlagsProvider({
  googleSignIn,
  children,
}: {
  googleSignIn: boolean
  children: ReactNode
}) {
  return <GoogleSignInContext value={googleSignIn}>{children}</GoogleSignInContext>
}

/** Mock mode only: the dev override, or the flag in this app's own mock store. */
function mockFlagOn() {
  return (
    isMockFlagForcedOn(PLAYER_GOOGLE_SIGN_IN_FLAG) ||
    mockStore
      .getSnapshot()
      .featureFlags.some((flag) => flag.key === PLAYER_GOOGLE_SIGN_IN_FLAG && flag.on)
  )
}

/**
 * Is Google sign-in on for players? The one way a Player component asks (D-2026-11-18-01). Real mode
 * returns the server's read from the first render, so no Google control flashes in or out. Mock mode
 * also follows this app's mock store; it starts from the server value, so hydration matches.
 */
export function usePlayerGoogleSignInEnabled(): boolean {
  const fromServer = useContext(GoogleSignInContext)
  const mockValue = useSyncExternalStore(mockStore.subscribe, mockFlagOn, () => fromServer)
  return isRealDataMode() ? fromServer : mockValue
}
