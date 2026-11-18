'use client'
import { NoGoogleAccountSheet } from '@rotra/ui/no-google-account-sheet'
import { useState } from 'react'

/**
 * The No Google account sheet, ready to open from any screen (P-LOGIN invite flow, P-INVITE,
 * P-GOOGLE-REQUIRED, the announcement band): call `open()`, render `sheet` once.
 */
export function useNoGoogleSheet() {
  const [isOpen, setOpen] = useState(false)
  return {
    open: () => setOpen(true),
    sheet: <NoGoogleAccountSheet open={isOpen} onOpenChange={setOpen} />,
  }
}
