import { cn } from '@rotra/ui/cn'
import type { ReactNode } from 'react'
import { type SyncState, syncLabel, syncTone } from '../SyncStatus.helpers'

export type SyncChange = { id: string; text: string; at: string }
export type SyncGroup = { area: string; changes: SyncChange[] }

export type SyncDetailsProps = {
  state: SyncState
  pending?: number
  lastSyncedAt?: string
  /** One or two sentences under the headline, e.g. "Everything on this device synced. Last sync 7:42 PM." */
  description: ReactNode
  /** Changes saved here and not yet synced, grouped by area (Roster, Queue, Matches and results, …) */
  waiting: SyncGroup[]
  /** Recent changes from this device that have synced */
  synced: SyncGroup[]
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

function Groups({ groups, waiting }: { groups: SyncGroup[]; waiting?: boolean }) {
  return groups.map((group) => (
    <div
      key={group.area}
      className={cn(
        'flex flex-col gap-1.5 rounded-md border border-border-strong bg-bg px-3 py-2.5',
        waiting && 'border-warn',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <b>{group.area}</b>
        <span className="text-[13px] text-fg2 tabular-nums">
          {plural(group.changes.length, 'change')}
        </span>
      </div>
      <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[13px]">
        {group.changes.map((change) => (
          <li key={change.id} className="flex min-w-0 justify-between gap-3">
            <span className="[overflow-wrap:anywhere]">{change.text}</span>
            <span className="flex-none text-fg2 tabular-nums">{change.at}</span>
          </li>
        ))}
      </ul>
    </div>
  ))
}

/**
 * The body of the Queue prototype's "Sync status" sheet: a headline for the current state, then what is
 * waiting on this device and what has synced, grouped by area.
 */
export function SyncDetails({
  state,
  pending,
  lastSyncedAt,
  description,
  waiting,
  synced,
}: SyncDetailsProps) {
  const tone = syncTone(state)
  const waitingCount = waiting.reduce((n, g) => n + g.changes.length, 0)
  return (
    <>
      <div
        className={cn(
          'flex items-start gap-3 rounded-lg border px-3.5 py-3',
          tone === 'ok' || tone === 'busy'
            ? 'border-accent/45 bg-accent-subtle'
            : tone === 'error'
              ? 'border-error bg-error-subtle'
              : 'border-warn bg-warn-subtle',
        )}
      >
        <i
          aria-hidden
          className={cn(
            'mt-[7px] size-2.5 flex-none rounded-full',
            tone === 'error' ? 'bg-error' : tone === 'warn' ? 'bg-warn' : 'bg-accent',
            tone === 'busy' && 'animate-pulse motion-reduce:animate-none',
          )}
        />
        <div>
          <b>{syncLabel(state, pending, lastSyncedAt)}</b>
          <p className="m-0 text-[13px] text-fg2">{description}</p>
        </div>
      </div>
      {waitingCount ? (
        <section className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold tracking-[0.5px] text-fg2 uppercase">
            Waiting to sync · {waitingCount}
          </span>
          <Groups groups={waiting} waiting />
        </section>
      ) : null}
      <section className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold tracking-[0.5px] text-fg2 uppercase">
          Synced from this device
        </span>
        {synced.length ? (
          <Groups groups={synced} />
        ) : (
          <p className="m-0 text-[13px] text-fg2">
            Nothing has synced from this device yet. Changes you make appear here.
          </p>
        )}
      </section>
      <p className="m-0 text-[13px] text-fg2">
        Shows changes made on this device only. Another device's changes appear after it syncs, and
        the public session page updates only from synced data.
      </p>
    </>
  )
}
