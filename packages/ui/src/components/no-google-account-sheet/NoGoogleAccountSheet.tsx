'use client'

import { Button } from '@rotra/ui/button'
import { Sheet } from '@rotra/ui/sheet'

export type NoGoogleAccountSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * The prototype's SHEETS.noGoogle: "No Google account?", four steps to make a free Google account
 * with the email the player already uses, and **Got it**. Self-contained: it holds no state beyond
 * `open`, so P-LOGIN, P-INVITE, the announcement band and P-GOOGLE-REQUIRED all open the same sheet.
 */
export function NoGoogleAccountSheet({ open, onOpenChange }: NoGoogleAccountSheetProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="No Google account?"
      footer={
        <Button variant="primary" onClick={() => onOpenChange(false)}>
          Got it
        </Button>
      }
    >
      <p className="m-0 text-fg2">
        You don't need Gmail. Google lets you make a free account with the email you already use.
      </p>
      <ol className="m-0 flex flex-col gap-2 pl-5">
        <li>
          Open <span className="font-mono">accounts.google.com/signup</span> on any device.
        </li>
        <li>
          Choose <b>Use my current email address instead</b> and enter your email.
        </li>
        <li>Google sends a code to that email. Enter it and set a Google password.</li>
        <li>
          Come back here and tap <b>Continue with Google</b>.
        </li>
      </ol>
      <p className="m-0 text-[13px] text-fg2">
        Still stuck? Ask your club or contact ROTRA. Nothing on your profile is lost while you sort
        it out.
      </p>
    </Sheet>
  )
}
