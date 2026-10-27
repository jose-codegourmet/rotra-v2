'use client'

import { Button } from '@rotra/ui/button'
import { cn } from '@rotra/ui/cn'
import { KeyValueList } from '@rotra/ui/key-value-list'
import { useEffect, useRef } from 'react'

export type InvalidSessionConfirmProps = {
  sessionTitle: string
  /** Already formatted: "Tue 14 Oct · 7:00 PM" */
  when: string
  /** Why the records cannot be trusted, in the operator's words from the recovery flow */
  reason: string
  /** The invalidation is being saved: Confirm is disabled and nothing can fire twice */
  isPending?: boolean
  onConfirm: () => void
  onBack: () => void
  className?: string
}

/**
 * D-INVALID-SESSION body and footer: names the session and the reason, states the consequence
 * word for word from dialogs.md, then Back to recovery and Confirm invalid session. No reconstruct
 * or edit controls: original-device loss has no manual reconstruction. Rendered inside the Sheet
 * the recovery flow opens; Confirm is never preselected (the sheet focuses its title).
 */
export function InvalidSessionConfirm({
  sessionTitle,
  when,
  reason,
  isPending = false,
  onConfirm,
  onBack,
  className,
}: InvalidSessionConfirmProps) {
  // One commit per attempt, even if a second tap lands before the parent re-renders with isPending.
  const fired = useRef(false)
  useEffect(() => {
    if (!isPending) fired.current = false
  }, [isPending])

  const confirm = () => {
    if (fired.current || isPending) return
    fired.current = true
    onConfirm()
  }

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="flex flex-col gap-3.5">
        <KeyValueList
          items={[
            { label: 'Session', value: sessionTitle },
            { label: 'When', value: when },
            { label: 'Reason', value: reason },
          ]}
        />
        <p className="m-0">
          This session will not count toward player records or rankings. No leaderboard or result
          slides will be generated.
        </p>
      </div>
      <div className="mt-4 flex flex-wrap justify-end gap-2.5 border-t border-border pt-3 [&>*]:flex-auto">
        <Button disabled={isPending} onClick={onBack}>
          Back to recovery
        </Button>
        <Button variant="danger" loading={isPending} onClick={confirm}>
          Confirm invalid session
        </Button>
      </div>
    </div>
  )
}
