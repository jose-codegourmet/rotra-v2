'use client'

import { cn } from '@rotra/ui/cn'
import { type SyncState, syncLabel, syncShortLabel, syncTone } from './SyncStatus.helpers'

export type { SyncState }

export type SyncStatusProps = {
  state: SyncState
  /** Changes saved on this device and not yet accepted by the server */
  pending?: number
  /** Formatted time of the last successful sync, e.g. "7:42 PM" */
  lastSyncedAt?: string
  /** Opens the details (a Sheet titled "Sync status" holding SyncDetails) */
  onOpen?: () => void
  className?: string
}

const DOT: Record<ReturnType<typeof syncTone>, string> = {
  ok: 'bg-accent',
  busy: 'bg-accent animate-pulse motion-reduce:animate-none',
  warn: 'bg-warn',
  error: 'bg-error',
}

/**
 * The Queue prototype's .conn pill in the top bar: a dot plus the exact save and sync label. The dot
 * never carries the state alone. Phones (≤ 480 px) show the short form.
 */
export function SyncStatus({
  state,
  pending = 0,
  lastSyncedAt,
  onOpen,
  className,
}: SyncStatusProps) {
  const label = syncLabel(state, pending, lastSyncedAt)
  const short = syncShortLabel(state, pending)
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-label={`Sync status: ${label}. Show what synced`}
      className={cn(
        'inline-flex min-h-8 max-w-[52vw] min-w-0 items-center gap-1.5 overflow-hidden rounded-full border border-border-strong bg-transparent px-2.5 py-1 text-[13px] whitespace-nowrap',
        'hover:border-accent hover:bg-surface max-[480px]:max-w-none',
        className,
      )}
    >
      <i aria-hidden className={cn('size-2 flex-none rounded-full', DOT[syncTone(state)])} />
      <span className="truncate max-[480px]:hidden">{label}</span>
      <span aria-hidden className="hidden truncate max-[480px]:inline">
        {short}
      </span>
    </button>
  )
}
