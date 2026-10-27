'use client'

import { Button } from '@rotra/ui/button'
import { Chip } from '@rotra/ui/chip'
import { KeyValueList } from '@rotra/ui/key-value-list'
import { Sheet } from '@rotra/ui/sheet'

export type PeekSessionState = 'live' | 'prepared' | 'completed' | 'invalid'

export type SessionPeekSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  state: PeekSessionState
  startsAt: number
  endsAt: number
  venueName: string
  courts: number
  rosterCount: number
  /** Opened from setup: notes that the draft is kept, and offers Back to setup */
  fromSetup?: boolean
  /** Opens the console, preparation or record, by state */
  onOpen: () => void
}

const STATE = {
  live: { chip: 'accent', label: 'Live now', open: 'Open live session' },
  prepared: { chip: 'warn', label: 'Prepared', open: 'Open preparation' },
  completed: { chip: 'neutral', label: 'Completed', open: 'Open session record' },
  invalid: { chip: 'error', label: 'Invalid', open: 'Open session record' },
} as const

const time = (at: number) =>
  new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
const date = (at: number) =>
  new Date(at).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })

/** The read-only summary every clash's View it opens: state, when, venue, courts and roster size. */
export function SessionPeekSheet({
  open,
  onOpenChange,
  title,
  state,
  startsAt,
  endsAt,
  venueName,
  courts,
  rosterCount,
  fromSetup,
  onOpen,
}: SessionPeekSheetProps) {
  const s = STATE[state]
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>
            {fromSetup ? 'Back to setup' : 'Close'}
          </Button>
          <Button variant="primary" onClick={onOpen}>
            {s.open}
          </Button>
        </>
      }
    >
      <div className="flex flex-wrap gap-2">
        <Chip tone={s.chip}>{s.label}</Chip>
      </div>
      <KeyValueList
        items={[
          { label: 'When', value: `${date(startsAt)}, ${time(startsAt)}–${time(endsAt)}` },
          { label: 'Venue', value: venueName },
          { label: 'Courts', value: String(courts) },
          { label: 'Roster', value: `${rosterCount} player${rosterCount === 1 ? '' : 's'}` },
        ]}
      />
      {fromSetup ? (
        <p className="m-0 text-[13px] text-fg2">Your setup stays as it is if you go back.</p>
      ) : null}
    </Sheet>
  )
}
