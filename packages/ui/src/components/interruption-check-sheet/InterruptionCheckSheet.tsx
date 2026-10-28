'use client'

import { Button } from '@rotra/ui/button'
import { KeyValueList } from '@rotra/ui/key-value-list'
import { Notice } from '@rotra/ui/notice'
import { Sheet } from '@rotra/ui/sheet'

export type InterruptionCheckSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  missingSummary: { label: string; detail: string }[]
  onYes: () => void
  onNo: () => void
  onBack: () => void
  isPending?: boolean
  error?: string
}
export function InterruptionCheckSheet({
  open,
  onOpenChange,
  missingSummary,
  onYes,
  onNo,
  onBack,
  isPending,
  error,
}: InterruptionCheckSheetProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!isPending) onOpenChange(next)
      }}
      title="Was the session interrupted?"
      dismissible={!isPending}
      footer={
        <>
          <Button onClick={onBack} disabled={isPending}>
            Back
          </Button>
          <Button onClick={onNo} disabled={isPending}>
            No
          </Button>
          <Button onClick={onYes} loading={isPending}>
            Yes
          </Button>
        </>
      }
    >
      <Notice tone="warn" title="Session records are incomplete.">
        Sync the original records before Session done.
      </Notice>
      <KeyValueList
        items={missingSummary.map((item) => ({ label: item.label, value: item.detail }))}
      />
      <p className="m-0 text-sm text-fg2">
        <b>Yes:</b> The original device must reconnect and supply its records. Recording can
        continue while recovery waits.
      </p>
      <p className="m-0 text-sm text-fg2">
        <b>No:</b> The inconsistent session cannot be recorded and will be invalid, with no official
        leaderboard or performance contribution. A separate confirmation is required.
      </p>
      {error ? <Notice tone="error">{error}</Notice> : null}
    </Sheet>
  )
}
