'use client'

import type { SessionMode } from '@rotra/data/queue-session/types'
import { Button } from '@rotra/ui/button'
import { KeyValueList } from '@rotra/ui/key-value-list'
import { Notice } from '@rotra/ui/notice'
import { Sheet } from '@rotra/ui/sheet'

/** How many waiting matches one run adds. The prototype's choices; the default is an open decision. */
export type AutoQueueCount = 2 | 3 | 4 | 6

export const AUTO_QUEUE_COUNTS: readonly AutoQueueCount[] = [2, 3, 4, 6]

export type AutoQueueSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionMode: SessionMode
  allowSingles: boolean
  allowDoubles: boolean
  /** Players marked present */
  presentCount: number
  /** The session's minimum games */
  minimumGames: number
  /** Matches to add; the container starts it at 3 (the prototype's preselection) */
  count: AutoQueueCount
  onCountChange: (count: AutoQueueCount) => void
  /** Generate N matches */
  onGenerate: (count: AutoQueueCount) => void
  /** Generation is running: nothing can fire twice */
  isPending?: boolean
  /** Why generation failed; the queue is unchanged */
  error?: string
}

const MODE_LABEL: Record<SessionMode, string> = { chill: 'Chill', fair: 'Fair', hard: 'Hard' }

function formatsLabel(allowSingles: boolean, allowDoubles: boolean) {
  return (
    [allowSingles && 'Singles', allowDoubles && 'Doubles'].filter(Boolean).join(' + ') ||
    'No standard format'
  )
}

/**
 * Q-AUTO: the session's mode, formats, present count and priority, the number of matches to add, and
 * Generate N matches. Only present players are used; nothing starts by itself; fun formats are never
 * generated. A failure is shown in the sheet and the queue stays as it was.
 */
export function AutoQueueSheet({
  open,
  onOpenChange,
  sessionMode,
  allowSingles,
  allowDoubles,
  presentCount,
  minimumGames,
  count,
  onCountChange,
  onGenerate,
  isPending = false,
  error,
}: AutoQueueSheetProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!isPending) onOpenChange(next)
      }}
      title="Auto queue"
      dismissible={!isPending}
      hideClose={isPending}
      footer={
        <>
          <Button disabled={isPending} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" loading={isPending} onClick={() => onGenerate(count)}>
            Generate {count} matches
          </Button>
        </>
      }
    >
      <KeyValueList
        items={[
          { label: 'Mode', value: MODE_LABEL[sessionMode] },
          { label: 'Formats', value: formatsLabel(allowSingles, allowDoubles) },
          { label: 'Present', value: `${presentCount} players` },
          { label: 'Priority', value: `Players furthest below ${minimumGames} games first` },
        ]}
      />
      <div className="flex min-w-0 flex-col gap-1.5">
        <span id="auto-queue-count-label" className="text-[13px] font-semibold text-fg2">
          Matches to add
        </span>
        <div
          role="group"
          aria-labelledby="auto-queue-count-label"
          className="flex flex-wrap items-center gap-2"
        >
          {AUTO_QUEUE_COUNTS.map((n) => (
            <Button
              key={n}
              size="sm"
              aria-pressed={count === n}
              disabled={isPending}
              onClick={() => onCountChange(n)}
              className="min-w-11 tabular-nums"
            >
              {n}
            </Button>
          ))}
        </div>
        <span className="text-xs text-fg2">
          Prototype control. ROTRA hasn't decided the default number of rounds.
        </span>
      </div>
      <p className="m-0 text-[13px] text-fg2">
        Only present players are used. Nothing starts by itself, and fun formats are never generated.
      </p>
      {error ? <Notice tone="warn">{error}</Notice> : null}
    </Sheet>
  )
}
