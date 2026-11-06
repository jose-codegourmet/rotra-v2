'use client'

import { ConfirmSheet } from '@rotra/ui/confirm-sheet'
import { DateTimePicker } from '@rotra/ui/date-time-picker'
import { Field } from '@rotra/ui/field'
import { KeyValueList } from '@rotra/ui/key-value-list'
import { Notice } from '@rotra/ui/notice'
import { useEffect, useState } from 'react'
import {
  defaultNewEnd,
  formatPlannedFor,
  newEndBounds,
  startNeedsNewEnd,
} from './StartSessionSheet.helpers'

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
  /**
   * The session's planned start and end. When both are given and the start is late (after the
   * planned end) or on another day than planned (T3), the sheet asks for a required New end.
   */
  plannedStartAt?: number
  plannedEndAt?: number
  /** The current time; stories pass a fixed one so the late-start state stays stable */
  now?: number
  /** Start session. Receives the chosen New end when one was required, otherwise nothing. */
  onConfirm: (newEndAt?: number) => void
}

/**
 * D-START-SESSION: the session summary, the level-lock notice, and Start session. A late or
 * other-day start first shows "This session was planned for …" and a required New end.
 */
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
  plannedStartAt,
  plannedEndAt,
  now: nowProp,
  onConfirm,
}: StartSessionSheetProps) {
  const now = nowProp ?? Date.now()
  const planned =
    plannedStartAt !== undefined && plannedEndAt !== undefined
      ? { start: plannedStartAt, end: plannedEndAt }
      : null
  const late = planned !== null && startNeedsNewEnd(planned.start, planned.end, now)
  const prefill = planned && late ? defaultNewEnd(planned.start, planned.end, now) : null
  const [newEndAt, setNewEndAt] = useState<number | null>(prefill)

  // Each opening starts from the pre-fill: now plus the planned length, rounded up to 15 minutes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset only when the sheet opens
  useEffect(() => {
    if (open) setNewEndAt(prefill)
  }, [open])

  const bounds = newEndBounds(now)
  const newEndValid = newEndAt !== null && newEndAt > now

  return (
    <ConfirmSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Start session?"
      confirmLabel="Start session"
      backLabel="Back"
      isPending={isPending}
      error={error}
      confirmDisabled={late && !newEndValid}
      onConfirm={() => (late && newEndAt !== null ? onConfirm(newEndAt) : onConfirm())}
      summary={
        <>
          {planned && late ? (
            <>
              <Notice tone="warn">
                This session was planned for {formatPlannedFor(planned.start, planned.end, now)}.
                Set a new end time to start.
              </Notice>
              <Field label="New end">
                <DateTimePicker
                  label="New end"
                  value={newEndAt}
                  onChange={setNewEndAt}
                  days={[now, bounds.max]}
                  base={now}
                  min={bounds.min}
                  max={bounds.max}
                  disabled={isPending}
                />
              </Field>
            </>
          ) : null}
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
