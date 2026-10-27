'use client'

import { ConfirmSheet } from '@rotra/ui/confirm-sheet'
import { KeyValueList } from '@rotra/ui/key-value-list'
import { Notice } from '@rotra/ui/notice'

export type StartSessionSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  courts: number
  formatsLabel: string
  modeLabel: string
  minimumGames: number
  rosterCount: number
  presentCount: number
  waitlistCount: number
  offline?: boolean
  isPending?: boolean
  /** The start was refused (another session started meanwhile, a save failure) */
  error?: string
  onConfirm: () => void
}

/** D-START-SESSION: the session summary, the level-lock notice, and Start session. */
export function StartSessionSheet({
  open,
  onOpenChange,
  title,
  courts,
  formatsLabel,
  modeLabel,
  minimumGames,
  rosterCount,
  presentCount,
  waitlistCount,
  offline,
  isPending,
  error,
  onConfirm,
}: StartSessionSheetProps) {
  return (
    <ConfirmSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Start session?"
      confirmLabel="Start session"
      backLabel="Back"
      isPending={isPending}
      error={error}
      onConfirm={onConfirm}
      summary={
        <>
          <KeyValueList
            items={[
              { label: 'Session', value: title },
              { label: 'Courts', value: String(courts) },
              { label: 'Formats', value: formatsLabel },
              { label: 'Mode', value: modeLabel },
              { label: 'Minimum', value: `${minimumGames} games` },
              {
                label: 'Roster',
                value: `${rosterCount} confirmed · ${presentCount} present${waitlistCount ? ` · ${waitlistCount} on the waitlist` : ''}`,
              },
            ]}
          />
          {offline ? (
            <Notice tone="warn">
              Starting on this device while offline. It syncs when you reconnect.
            </Notice>
          ) : null}
        </>
      }
      consequence="Every player's level locks now. Players you add later get a level when you add them, and it locks too."
    />
  )
}
