'use client'

import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { GoogleMark } from '@rotra/ui/google-mark'
import { Sheet } from '@rotra/ui/sheet'

export type GoogleAccountPickerAccount = {
  name: string
  email: string
  /** What picking it does in the prototype; never shown in real mode */
  hint: string
}

export type GoogleAccountPickerSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  accounts: GoogleAccountPickerAccount[]
  onPick: (account: GoogleAccountPickerAccount) => void
}

/**
 * The prototype's SHEETS.gpick: a stand-in for Google's own window, listing fictional Google
 * accounts. Mock mode only; real mode redirects to Google and never renders this.
 */
export function GoogleAccountPickerSheet({
  open,
  onOpenChange,
  accounts,
  onPick,
}: GoogleAccountPickerSheetProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={
        <span className="inline-flex items-center gap-2">
          <GoogleMark />
          Sign in with Google
        </span>
      }
      footer={<Button onClick={() => onOpenChange(false)}>Cancel</Button>}
    >
      <p className="m-0 text-fg2">Choose an account to continue to ROTRA.</p>
      <ul className="m-0 flex list-none flex-col overflow-hidden rounded-lg border border-border p-0">
        {accounts.map((account) => (
          <li key={account.email} className="border-t border-border first:border-t-0">
            <button
              type="button"
              onClick={() => onPick(account)}
              className="flex min-h-[60px] w-full cursor-pointer items-center gap-3 border-0 bg-transparent px-3.5 py-3 text-left font-[inherit] text-inherit hover:bg-elev focus-visible:bg-elev"
            >
              <Avatar name={account.name} size={40} />
              <span className="flex min-w-0 flex-col">
                <b className="[overflow-wrap:anywhere]">{account.name}</b>
                <span className="text-[13px] text-fg2 [overflow-wrap:anywhere]">
                  {account.email}
                </span>
                <span className="text-[13px] text-fg3">Prototype: {account.hint}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="m-0 text-[13px] text-fg2">
        Prototype only: this stands in for Google's own sign-in window. ROTRA gets your name and
        email from Google, nothing else.
      </p>
    </Sheet>
  )
}
