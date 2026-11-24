'use client'

import type { PlayerSessionAccess } from '@rotra/data/public-session/types'
import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { Chip } from '@rotra/ui/chip'
import { cn } from '@rotra/ui/cn'
import type { CourtPlayer } from '@rotra/ui/court-drawing'
import { EmptyState } from '@rotra/ui/empty-state'
import { Icon } from '@rotra/ui/icon'
import { IconButton } from '@rotra/ui/icon-button'
import { Notice } from '@rotra/ui/notice'
import { PublicQueueMatchDialog } from '@rotra/ui/public-queue-match-dialog'
import { Skeleton } from '@rotra/ui/skeleton'
import { type UIEvent, useCallback, useEffect, useRef, useState } from 'react'

export type PublicSessionQueueProps = {
  access: PlayerSessionAccess | null
  loginHref?: string
  checking?: boolean
  failed?: boolean
  onRetry: () => void
  /**
   * A signed-in ROTRA player: each face with a `participant` index is a button (“NAME. View
   * profile”, accent ring on hover and focus) that opens that participant's profile card.
   */
  onOpenPlayer?: (participant: number) => void
}

type QueuedMatch = PlayerSessionAccess['queue'][number]
type QueuedPlayer = QueuedMatch['teamA'][number]

/** First word only; a masked name ("Y*** Z***") stays masked ("Y***"). */
const firstName = (name: string) => name.split(/\s+/).filter(Boolean)[0] ?? name

/** Mirrors FORMAT_LABELS in @rotra/data/match/match.rules (a UI component may only import types). */
const FORMAT_LABELS: Record<QueuedMatch['format'], string> = {
  singles: 'Singles',
  doubles: 'Doubles',
  fun_1v2: '1v2 fun',
  fun_3v3: '3v3 fun',
  fun_4v4: '4v4 fun',
  fun_5v5: '5v5 fun',
}

/** The level ring: beginner blue, intermediate yellow, advanced red, grey when not assessed. */
const ringOf = (level: QueuedPlayer['level']) =>
  level?.startsWith('beginner')
    ? '[--ring:var(--lv-beg)]'
    : level?.startsWith('intermediate')
      ? '[--ring:var(--lv-int)]'
      : level?.startsWith('advanced')
        ? '[--ring:var(--lv-adv)]'
        : '[--ring:var(--lv-none)]'

/** A queued face as a court face: first name under the public rule, picture and level ring. */
const courtFace = (player: QueuedPlayer, i: number): CourtPlayer => {
  const name = firstName(player.name)
  return {
    id: `${i}-${name}`,
    name,
    shortName: name,
    level: player.level,
    photoUrl: player.pictureUrl ?? undefined,
  }
}

/** A team as overlapping 34 px faces, the first in front and each next tucked behind it. No names. */
function Team({
  players,
  onOpenPlayer,
}: {
  players: QueuedPlayer[]
  onOpenPlayer?: (participant: number) => void
}) {
  return (
    <ul className="m-0 flex min-w-0 list-none flex-row flex-wrap items-center gap-y-1 p-0 pl-2.5">
      {players.map((player, i) => {
        const name = firstName(player.name)
        const participant = player.participant
        const face = (
          <>
            <Avatar
              name={name}
              src={player.pictureUrl ?? undefined}
              className={cn(
                'size-[34px] text-[11px] outline-2 outline-(--ring) shadow-[0_0_0_2px_var(--surface)]',
                onOpenPlayer &&
                  participant !== undefined &&
                  'group-hover/qface:shadow-[0_0_0_2px_var(--surface),0_0_0_4px_var(--accent)] group-focus-visible/qface:shadow-[0_0_0_2px_var(--surface),0_0_0_4px_var(--accent)]',
              )}
            />
            <span className="sr-only">{name}</span>
          </>
        )
        return (
          <li
            // biome-ignore lint/suspicious/noArrayIndexKey: a team is a fixed, ordered list of up to five
            key={i}
            title={name}
            style={{ zIndex: players.length - i }}
            className={cn('relative -ml-2.5 flex min-w-0 flex-none', ringOf(player.level))}
          >
            {onOpenPlayer && participant !== undefined ? (
              <button
                type="button"
                aria-label={`${name}. View profile`}
                onClick={() => onOpenPlayer(participant)}
                className="group/qface m-0 flex cursor-pointer rounded-full border-0 bg-transparent p-0 text-inherit focus-visible:outline-none"
              >
                {face}
              </button>
            ) : (
              face
            )}
          </li>
        )
      })}
    </ul>
  )
}

/**
 * One queued match as a compact tile (.pqc): position, Team A, VS, Team B, and the eye button at the
 * top right that opens the match. Faces carry the level ring and no names (they stay in each face's
 * label and in the dialog).
 */
function QueueRow({
  match,
  position,
  onOpenPlayer,
  onViewMatch,
}: {
  match: QueuedMatch
  position: number
  onOpenPlayer?: (participant: number) => void
  onViewMatch: () => void
}) {
  const next = position === 1
  return (
    <article
      aria-label={`Queue position ${position}${next ? ', next match' : ''}`}
      className={cn(
        'relative grid min-w-0 items-center justify-start gap-x-3.5 gap-y-1.5 rounded-lg border bg-surface py-2.5 pr-11 pl-3 shadow-card',
        'grid-cols-[44px_auto_auto_auto] max-[640px]:grid-cols-[34px_auto_auto_auto]',
        next
          ? 'border-warn bg-[linear-gradient(180deg,var(--warn-subtle),transparent_70%)] shadow-[0_0_0_1px_var(--warn),0_0_16px_2px_color-mix(in_srgb,var(--warn)_45%,transparent)]'
          : 'border-border-strong',
      )}
    >
      <div className="flex min-w-0 flex-col items-start gap-1.5">
        <span className="font-mono text-base font-bold">#{position}</span>
        {next ? <Chip tone="warn">Next</Chip> : null}
      </div>
      <Team players={match.teamA} onOpenPlayer={onOpenPlayer} />
      <div className="text-center text-[11px] text-fg2 opacity-80">VS</div>
      <Team players={match.teamB} onOpenPlayer={onOpenPlayer} />
      <IconButton
        variant="ghost"
        size="xs"
        label={`View queue match #${position}`}
        title="View match"
        onClick={onViewMatch}
        className="absolute top-1.5 right-1.5"
      >
        <Icon name="eye" size={18} />
      </IconButton>
    </article>
  )
}

/** #2 onward: scrolls vertically (max about 380 px) and fades at the bottom until scrolled to the end. */
function RestOfQueue({
  matches,
  onOpenPlayer,
  onViewMatch,
}: {
  matches: QueuedMatch[]
  onOpenPlayer?: (participant: number) => void
  onViewMatch: (matchNo: number) => void
}) {
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
          <QueueRow
            key={match.matchNo}
            match={match}
            position={i + 2}
            onOpenPlayer={onOpenPlayer}
            onViewMatch={() => onViewMatch(match.matchNo)}
          />
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
  onOpenPlayer,
}: PublicSessionQueueProps) {
  // The match the eye button opened, by number: it stays open as the queue refreshes, and reads
  // "This match has left the queue." if the Queue Master moved or removed it meanwhile.
  const [viewing, setViewing] = useState<number | null>(null)
  const viewIndex =
    access && viewing !== null ? access.queue.findIndex((m) => m.matchNo === viewing) : -1
  const viewed = viewIndex >= 0 ? access?.queue[viewIndex] : undefined
  return (
    <section aria-label="Queue" className="mt-5 flex flex-col gap-3">
      <h2 className="text-lg font-bold">Queue</h2>
      {access ? (
        <>
          <p className="text-[13px] text-fg2">Read-only · Last synced queue</p>
          {access.queue[0] ? (
            <div className="flex flex-col gap-1.5">
              <QueueRow
                match={access.queue[0]}
                position={1}
                onOpenPlayer={onOpenPlayer}
                onViewMatch={() => setViewing(access.queue[0]?.matchNo ?? null)}
              />
              {access.queue.length > 1 ? (
                <RestOfQueue
                  matches={access.queue.slice(1)}
                  onOpenPlayer={onOpenPlayer}
                  onViewMatch={setViewing}
                />
              ) : null}
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
      <PublicQueueMatchDialog
        open={viewing !== null}
        onOpenChange={(open) => {
          if (!open) setViewing(null)
        }}
        position={viewIndex + 1}
        label={viewed ? (viewed.label ?? FORMAT_LABELS[viewed.format]) : 'Match'}
        match={
          viewed
            ? { teamA: viewed.teamA.map(courtFace), teamB: viewed.teamB.map(courtFace) }
            : null
        }
      />
    </section>
  )
}
