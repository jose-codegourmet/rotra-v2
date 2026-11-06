'use client'

import { Button } from '@rotra/ui/button'
import { Field } from '@rotra/ui/field'
import { Notice } from '@rotra/ui/notice'
import { Sheet } from '@rotra/ui/sheet'
import { TextInput } from '@rotra/ui/text-input'
import { type ReactNode, useEffect, useRef, useState } from 'react'

export const CANCEL_REASON_MAX = 120

export type CancelSessionSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Session title; the sheet title is "Cancel TITLE?" */
  title: string
  /** "Sat, Nov 7 · 6:00–9:00 PM" */
  whenLabel: string
  joinedCount: number
  waitlistCount: number
  /** Roster players marked paid; the paid warning shows only when this is above 0 */
  paidCount: number
  /** Prefills Reason when the sheet opens */
  defaultReason?: string
  isPending?: boolean
  /** Why the commit failed (session started meanwhile, a save failure) */
  error?: ReactNode
  /** Trimmed reason; empty string when none */
  onConfirm: (reason: string) => void
}

const players = (n: number) => `${n} ${n === 1 ? 'player' : 'players'}`

function paidWarning(n: number): string {
  return n === 1
    ? '1 player is marked paid. Refunds happen outside ROTRA.'
    : `${n} players are marked paid. Refunds happen outside ROTRA.`
}

/**
 * D-CANCEL-SESSION: names the prepared session, how many joined and waitlisted, warns when any are
 * marked paid, takes an optional reason, then Keep session and the destructive Cancel session.
 */
export function CancelSessionSheet({
  open,
  onOpenChange,
  title,
  whenLabel,
  joinedCount,
  waitlistCount,
  paidCount,
  defaultReason = '',
  isPending = false,
  error,
  onConfirm,
}: CancelSessionSheetProps) {
  const keepRef = useRef<HTMLButtonElement>(null)
  const [reason, setReason] = useState(defaultReason)
  const fired = useRef(false)

  useEffect(() => {
    if (open) setReason(defaultReason)
  }, [open, defaultReason])

  useEffect(() => {
    if (!open || isPending || error) fired.current = false
  }, [open, isPending, error])

  // Dialogs.md: Keep session is focused first (not the title, not Cancel session).
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => keepRef.current?.focus(), 20)
    return () => clearTimeout(t)
  }, [open])

  const confirm = () => {
    if (fired.current || isPending) return
    fired.current = true
    onConfirm(reason.trim())
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!isPending) onOpenChange(next)
      }}
      title={`Cancel ${title}?`}
      dismissible={!isPending}
      hideClose={isPending}
      footer={
        <>
          <Button ref={keepRef} disabled={isPending} onClick={() => onOpenChange(false)}>
            Keep session
          </Button>
          <Button variant="danger" loading={isPending} onClick={confirm}>
            Cancel session
          </Button>
        </>
      }
    >
      <p className="m-0">{whenLabel}</p>
      <p className="m-0 text-[13px] text-fg2">
        {players(joinedCount)} joined · {waitlistCount} on the waitlist
      </p>
      {paidCount > 0 ? <Notice tone="warn">{paidWarning(paidCount)}</Notice> : null}
      <Field label="Reason" optional>
        <TextInput
          value={reason}
          onChange={(event) => setReason(event.target.value.slice(0, CANCEL_REASON_MAX))}
          maxLength={CANCEL_REASON_MAX}
          autoComplete="off"
          disabled={isPending}
        />
      </Field>
      <Notice tone="error">This can't be undone. To play anyway, create a new session.</Notice>
      {error ? <Notice tone="error">{error}</Notice> : null}
    </Sheet>
  )
}
