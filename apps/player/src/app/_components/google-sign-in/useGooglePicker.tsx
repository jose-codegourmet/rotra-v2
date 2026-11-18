'use client'
import type { GoogleIdentity, GoogleRedirectIntent } from '@rotra/data/google-sign-in/types'
import { useGoogleAccountPicker } from '@rotra/data/google-sign-in/useGoogleAccountPicker'
import { realPeekGoogleReturn, realStartGoogle, takeGoogleReturn } from '@rotra/data/real/google'
import { isRealDataMode } from '@rotra/data/real/mode'
import { GoogleAccountPickerSheet } from '@rotra/ui/google-account-picker-sheet'
import { toast } from '@rotra/ui/toaster'
import { useEffect, useEffectEvent, useState } from 'react'

/**
 * Which screen starts Google, for real mode: `key` is the screen's own name (the result comes back
 * to the screen with the same key) and `intent` is why (`connect` for a signed-in player adding or
 * changing Google; `login`, `register`, `claim` for Continue with Google).
 */
export type GoogleEntry = { key: string; intent: GoogleRedirectIntent }

/**
 * Real mode only (#922): the browser just came back from Google for the screen `key`. Calls
 * `onIdentity` once with the name and email to show, exactly as the prototype's picker would; the
 * screen then runs the same mutation it runs in mock mode, and the server answers from the Google
 * account it verified. A trip that failed shows a toast instead. Does nothing in mock mode, and
 * nothing when no result is waiting (no request is made).
 */
export function useGoogleReturn(key: string | null, onIdentity: (google: GoogleIdentity) => void) {
  const deliver = useEffectEvent(onIdentity)
  useEffect(() => {
    if (!key || !isRealDataMode() || !takeGoogleReturn(key)) return
    realPeekGoogleReturn(key).then(deliver, (error: Error) => toast.error(error.message))
  }, [key])
}

/**
 * Starts Google sign-in. THE one place real mode swaps in a redirect (#922). Mock mode: `start`
 * opens the prototype's account picker (a stand-in for Google's own window) and hands the picked
 * account back. Real mode: `start` sends the browser to Google; the OAuth callback brings it back
 * to this page, and `onReturn` (pass the same handler) receives the account then.
 *
 * Use it in every Google entry point (P-LOGIN, P-INVITE, P-CLAIM, P-GOOGLE-REQUIRED, Sign-in
 * methods): call `start(onIdentity)`, then render `sheet` once. `onIdentity` receives the name and
 * email Google gives ROTRA; the picker has already closed, so show "Waiting for Google…" from the
 * mutation's own pending state. `startWith(identity, onIdentity)` is for **Connect <tried email>**:
 * mock mode hands that account straight back; real mode still goes to Google, which is the only
 * proof of who owns it.
 */
export function useGooglePicker(entry: GoogleEntry, onReturn?: (google: GoogleIdentity) => void) {
  const accounts = useGoogleAccountPicker()
  const [onIdentity, setOnIdentity] = useState<((google: GoogleIdentity) => void) | null>(null)
  useGoogleReturn(onReturn ? entry.key : null, onReturn ?? (() => undefined))
  const redirect = () => {
    realStartGoogle({
      ...entry,
      returnTo: `${window.location.pathname}${window.location.search}`,
    }).catch((error: Error) => toast.error(error.message))
  }
  const start = (handler: (google: GoogleIdentity) => void) => {
    if (isRealDataMode()) redirect()
    else setOnIdentity(() => handler)
  }
  const startWith = (identity: GoogleIdentity, handler: (google: GoogleIdentity) => void) => {
    if (isRealDataMode()) redirect()
    else handler(identity)
  }
  const sheet = (
    <GoogleAccountPickerSheet
      open={onIdentity !== null}
      onOpenChange={(open) => {
        if (!open) setOnIdentity(null)
      }}
      accounts={accounts}
      onPick={(account) => {
        const handler = onIdentity
        setOnIdentity(null)
        handler?.({ email: account.email, name: account.name })
      }}
    />
  )
  return { start, startWith, sheet }
}
