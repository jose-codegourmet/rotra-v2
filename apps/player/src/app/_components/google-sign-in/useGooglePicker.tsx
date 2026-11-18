'use client'
import type { GoogleIdentity } from '@rotra/data/google-sign-in/types'
import { useGoogleAccountPicker } from '@rotra/data/google-sign-in/useGoogleAccountPicker'
import { isRealDataMode } from '@rotra/data/real/mode'
import { GoogleAccountPickerSheet } from '@rotra/ui/google-account-picker-sheet'
import { toast } from '@rotra/ui/toaster'
import { useState } from 'react'

/**
 * Starts Google sign-in. THE one place real mode swaps in a redirect (#922): `start` currently opens
 * the prototype's account picker (a stand-in for Google's own window) and hands the picked account
 * back; real mode will redirect to Google here instead and return through the OAuth callback.
 *
 * Use it in every Google entry point (P-LOGIN, P-INVITE, P-CLAIM, P-GOOGLE-REQUIRED, Sign-in
 * methods): call `start(onIdentity)`, then render `sheet` once. `onIdentity` receives the name and
 * email Google gives ROTRA; the picker has already closed, so show "Waiting for Google…" from the
 * mutation's own pending state.
 */
export function useGooglePicker() {
  const accounts = useGoogleAccountPicker()
  const [onIdentity, setOnIdentity] = useState<((google: GoogleIdentity) => void) | null>(null)
  const start = (handler: (google: GoogleIdentity) => void) => {
    if (isRealDataMode()) {
      toast.error("Google sign-in isn't connected to saved data yet.")
      return
    }
    setOnIdentity(() => handler)
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
  return { start, sheet }
}
