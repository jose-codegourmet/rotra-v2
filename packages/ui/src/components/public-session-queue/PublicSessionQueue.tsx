'use client'

import type { PlayerSessionAccess } from '@rotra/data/public-session/types'
import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { Chip } from '@rotra/ui/chip'
import { cn } from '@rotra/ui/cn'
import { EmptyState } from '@rotra/ui/empty-state'
import { Notice } from '@rotra/ui/notice'
import { Skeleton } from '@rotra/ui/skeleton'
import { type UIEvent, useCallback, useEffect, useRef, useState } from 'react'

export type PublicSessionQueueProps = {
  access: PlayerSessionAccess | null
  loginHref?: string
  checking?: boolean
  failed?: boolean
  onRetry: () => void
}

type QueuedMatch = PlayerSessionAccess['queue'][number]
type QueuedPlayer = QueuedMatch['teamA'][number]

/** First word only; a masked name ("Y*** Z***") stays masked ("Y***"). */
const firstName = (name: string) => name.split(/\s+/).filter(Boolean)[0] ?? name

function Side({ players }: { players: QueuedPlayer[] }) {
  return (
    <ul className="m-0 flex list-none flex-wrap gap-x-3 gap-y-1 p-0 min-[641px]:flex-nowrap">
      {players.map((player, i) => {
        const name = firstName(player.name)
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: a side is a fixed, ordered list of up to five
          <li key={i} className="flex w-[52px] min-w-0 flex-col items-center gap-px">
            <Avatar name={name} size={36} className="text-xs" />
            <span className="max-w-[52px] truncate text-xs font-semibold">{name}</span>
          </li>
        )
      })}
    </ul>
  )
}

/** One queued match: position, Team A, VS, Team B. No format chip, no status line. */
function QueueRow({ match, position }: { match: QueuedMatch; position: number }) {
  const next = position === 1
  return (
    <article
      aria-label={`Queue position ${position}${next ? ', next match' : ''}`}
      className={cn(
        'relative grid min-w-0 items-center gap-x-4 gap-y-2 rounded-lg border bg-surface px-4 py-3.5 shadow-card',
        'grid-cols-[52px_minmax(0,1fr)_auto_minmax(0,1fr)]',
        'max-[640px]:grid-cols-[46px_minmax(0,1fr)] max-[640px]:gap-x-3',
        next
          ? 'border-warn bg-[linear-gradient(180deg,var(--warn-subtle),transparent_70%)] shadow-[0_0_0_1px_var(--warn),0_0_16px_2px_color-mix(in_srgb,var(--warn)_45%,transparent)]'
          : 'border-border-strong',
      )}
    >
      <div className="flex min-w-0 flex-col items-start gap-1.5 max-[640px]:row-span-3 max-[640px]:self-start">
        <span className="font-mono text-base font-bold">#{position}</span>
        {next ? <Chip tone="warn">Next</Chip> : null}
      </div>
      <Side players={match.teamA} />
      <div className="text-[11px] text-fg2 opacity-80 max-[640px]:text-left min-[641px]:text-center">
        VS
      </div>
      <Side players={match.teamB} />
    </article>
  )
}

/** #2 onward: scrolls vertically (max about 380 px) and fades at the bottom until scrolled to the end. */
function RestOfQueue({ matches }: { matches: QueuedMatch[] }) {
  const box = useRef<HTMLDivElement>(null)
  const [atEnd, setAtEnd] = useState(true)
  const sync = useCallback((el: HTMLElement) => {
    setAtEnd(el.scrollHeight - el.scrollTop - el.clientHeight <= 2)
  }, [])
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-measure when the list changes
  useEffect(() => {
    const el = box.current
    if (!el) return
    sync(el)
    const observer = new ResizeObserver(() => sync(el))
    observer.observe(el)
    return () => observer.disconnect()
  }, [matches, sync])
  return (
    // biome-ignore lint/a11y/useSemanticElements: a group/region div; a fieldset or section would change the drawn layout
    <div
      ref={box}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: a scroll region must be keyboard reachable
      tabIndex={0}
      role="region"
      aria-label="Rest of the queue, #2 onward, scrolls"
      onScroll={(event: UIEvent<HTMLDivElement>) => sync(event.currentTarget)}
      className={cn(
        '-m-1 max-h-[380px] overflow-y-auto overscroll-contain p-1',
        !atEnd &&
          '[-webkit-mask-image:linear-gradient(#000_calc(100%-64px),transparent)] [mask-image:linear-gradient(#000_calc(100%-64px),transparent)]',
      )}
    >
      <div className="grid grid-cols-1 gap-2.5">
        {matches.map((match, i) => (
          <QueueRow key={match.matchNo} match={match} position={i + 2} />
        ))}
      </div>
    </div>
  )
}

/** Q-PUBLIC Details: the read-only Queue, #1 pinned with Next, the rest as one-row matches. */
export function PublicSessionQueue({
  access,
  loginHref,
  checking,
  failed,
  onRetry,
}: PublicSessionQueueProps) {
  return (
    <section aria-label="Queue" className="mt-5 flex flex-col gap-3">
      <h2 className="text-lg font-bold">Queue</h2>
      {access ? (
        <>
          <p className="text-[13px] text-fg2">Read-only · Last synced queue</p>
          {access.queue[0] ? (
            <div className="flex flex-col gap-1.5">
              <QueueRow match={access.queue[0]} position={1} />
              {access.queue.length > 1 ? <RestOfQueue matches={access.queue.slice(1)} /> : null}
            </div>
          ) : (
            <EmptyState title="No matches queued yet." />
          )}
        </>
      ) : checking ? (
        <Skeleton className="h-24 rounded-lg" />
      ) : failed ? (
        <Notice tone="error">
          Couldn't check Player access. <Button onClick={onRetry}>Retry</Button>
        </Notice>
      ) : (
        <Notice tone="info">
          Log in with ROTRA Player to see the queue.
          {loginHref ? (
            <Button asChild>
              <a href={loginHref}>Log in with ROTRA Player</a>
            </Button>
          ) : null}
        </Notice>
      )}
    </section>
  )
}
