'use client'

import { Button } from '@rotra/ui/button'
import { Notice } from '@rotra/ui/notice'
import { Sheet } from '@rotra/ui/sheet'
import { useEffect, useRef } from 'react'

export type SignOutSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSignOut: () => void
  /** Changes saved on this device and not synced yet */
  pendingCount?: number
  /** A session is live */
  liveSessionTitle?: string
  offline?: boolean
  isPending?: boolean
}

/** D-SIGN-OUT: Sign out? with the unsynced, live-session and offline notices; Stay signed in has focus. */
export function SignOutSheet({
  open,
  onOpenChange,
  onSignOut,
  pendingCount = 0,
  liveSessionTitle,
  offline,
  isPending,
}: SignOutSheetProps) {
  const stayRef = useRef<HTMLButtonElement>(null)
  // The dialog copy asks for focus on Stay signed in, not on the title.
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => stayRef.current?.focus(), 20)
    return () => clearTimeout(t)
  }, [open])
  const many = pendingCount > 1
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!isPending) onOpenChange(next)
      }}
      title="Sign out?"
      dismissible={!isPending}
      footer={
        <>
          <Button ref={stayRef} onClick={() => onOpenChange(false)} disabled={isPending}>
            Stay signed in
          </Button>
          <Button variant="primary" onClick={onSignOut} loading={isPending}>
            Sign out
          </Button>
        </>
      }
    >
      <p className="m-0">You'll need the club username and password to sign in again.</p>
      {pendingCount > 0 ? (
        <Notice
          tone="warn"
          title={`${pendingCount} change${many ? "s haven't" : " hasn't"} synced yet.`}
        >
          {many ? 'They stay' : 'It stays'} on this device and {many ? 'sync' : 'syncs'} after you
          sign back in here.
        </Notice>
      ) : null}
      {liveSessionTitle ? (
        <Notice title={liveSessionTitle}>
          is still live. Signing out doesn't end it; sign back in to continue running it.
        </Notice>
      ) : null}
      {offline ? (
        <Notice tone="warn">
          You're offline. Signing back in needs an internet connection, so you can't get back in
          until you reconnect.
        </Notice>
      ) : null}
    </Sheet>
  )
}
