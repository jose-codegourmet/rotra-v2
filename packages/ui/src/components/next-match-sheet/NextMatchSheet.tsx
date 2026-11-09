'use client'

import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { Chip } from '@rotra/ui/chip'
import type { CourtPlayer } from '@rotra/ui/court-drawing'
import { useMediaQuery } from '@rotra/ui/hooks/use-media-query'
import { Notice } from '@rotra/ui/notice'
import { Sheet } from '@rotra/ui/sheet'
import { type PointerEvent, type ReactNode, useRef, useState } from 'react'

/** One waiting match the picker offers for the freed court. */
export type NextMatchCandidate = {
  matchId: string
  position: number
  teamA: CourtPlayer[]
  teamB: CourtPlayer[]
  formatLabel: string
}

export type NextMatchSheetProps = {
  open: boolean
  courtLabel: string
  matchNo: number
  candidates: NextMatchCandidate[]
  onPick: (matchId: string) => void
  onSkip: () => void
  isPending?: boolean
  error?: ReactNode
}

function Team({ players }: { players: CourtPlayer[] }) {
  return (
    <div className="flex flex-wrap justify-center gap-x-3.5 gap-y-2">
      {players.map((player) => (
        <div
          key={player.id}
          className="flex flex-col items-center gap-1"
          aria-label={`${player.name}, ${player.games ?? 0} games played`}
        >
          <span className="relative">
            <Avatar name={player.name} src={player.photoUrl} size={52} className="text-base" />
            <span
              aria-hidden
              className="absolute -top-1 -right-2 grid min-w-5 h-5 px-1 place-items-center rounded-full bg-on-photo/90 text-xs font-extrabold text-bg [:is(html[data-theme=light])_&]:text-fg"
            >
              {player.games ?? 0}
            </span>
          </span>
          <span className="max-w-full break-words text-[13px] font-bold">{player.shortName}</span>
        </div>
      ))}
    </div>
  )
}

function teamNames(players: CourtPlayer[]) {
  return players.map((player) => player.name).join(' and ')
}

// Mounted inside the sheet and keyed by the offered matches: every new offer starts at #1.
function MatchSlider({
  candidates,
  courtLabel,
  onPick,
  isPending,
}: Pick<NextMatchSheetProps, 'candidates' | 'courtLabel' | 'onPick' | 'isPending'>) {
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const slider = useRef<HTMLDivElement>(null)
  const drag = useRef<{ id: number; x: number; left: number; moved: boolean } | null>(null)
  const suppressClick = useRef(false)
  const [index, setIndex] = useState(0)
  const [atEnd, setAtEnd] = useState(candidates.length <= 1)
  const scrollTo = (i: number) => {
    const el = slider.current
    if (!el) return
    const card = el.children[Math.max(0, Math.min(i, candidates.length - 1))] as
      | HTMLElement
      | undefined
    if (card) el.scrollTo({ left: card.offsetLeft, behavior: reduced ? 'instant' : 'smooth' })
  }
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (
      e.pointerType === 'touch' ||
      e.button !== 0 ||
      isPending ||
      !e.isPrimary ||
      (e.target as HTMLElement).closest('button')
    )
      return
    drag.current = { id: e.pointerId, x: e.clientX, left: e.currentTarget.scrollLeft, moved: false }
  }
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const dx = e.clientX - d.x
    if (Math.abs(dx) > 6 && !d.moved) {
      d.moved = true
      e.currentTarget.style.scrollSnapType = 'none'
      e.currentTarget.style.cursor = 'grabbing'
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    if (d.moved) {
      e.preventDefault()
      e.currentTarget.scrollLeft = d.left - dx
    }
  }
  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    drag.current = null
    if (!d.moved) return
    const el = e.currentTarget
    const step = (el.children[1] as HTMLElement | undefined)?.offsetLeft ?? el.clientWidth
    const nearest = Math.round(el.scrollLeft / step)
    el.style.removeProperty('scroll-snap-type')
    el.style.removeProperty('cursor')
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)
    suppressClick.current = true
    setTimeout(() => {
      suppressClick.current = false
    }, 0)
    scrollTo(nearest)
  }
  return (
    <div className="flex min-w-0 items-center gap-1.5 max-[640px]:flex-1">
      {candidates.length > 1 ? (
        <Button
          size="sm"
          className="shrink-0 px-2 text-[22px]"
          aria-label="Previous match"
          disabled={isPending || index === 0}
          onClick={() => scrollTo(index - 1)}
        >
          ‹
        </Button>
      ) : null}
      <div className="relative min-w-0 flex-1 max-[640px]:self-stretch">
        <div
          ref={slider}
          role="region"
          aria-label={`Matches ready for ${courtLabel}`}
          tabIndex={0}
          className="relative flex h-full cursor-grab snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain select-none [scrollbar-width:none]"
          onScroll={(e) => {
            const el = e.currentTarget
            const step = (el.children[1] as HTMLElement | undefined)?.offsetLeft ?? el.clientWidth
            setIndex(Math.round(el.scrollLeft / step))
            setAtEnd(el.scrollWidth - el.scrollLeft - el.clientWidth <= 2)
          }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={endDrag}
          onPointerLeave={() => {
            if (drag.current && !drag.current.moved) drag.current = null
          }}
          onDragStart={(e) => e.preventDefault()}
          onClickCapture={(e) => {
            if (suppressClick.current) {
              e.preventDefault()
              e.stopPropagation()
              suppressClick.current = false
            }
          }}
        >
          {candidates.map((c, i) => (
            <article
              key={c.matchId}
              aria-label={`Match ${i + 1} of ${candidates.length}`}
              className="flex w-full shrink-0 snap-start flex-col gap-2.5 rounded-md border border-border-strong bg-bg p-4 max-[640px]:justify-center"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono font-bold">#{c.position}</span>
                <Chip tone="solid">{c.formatLabel}</Chip>
                {i === 0 ? <Chip tone="warn">Next in line</Chip> : null}
                <span className="ml-auto text-xs text-fg2">
                  {i + 1} of {candidates.length}
                </span>
              </div>
              <Team players={c.teamA} />
              <span className="text-center text-xs font-bold text-fg2">VS</span>
              <Team players={c.teamB} />
              <Button
                variant="primary"
                block
                disabled={isPending}
                aria-label={`Put match #${c.position} on ${courtLabel}: ${teamNames(c.teamA)} vs ${teamNames(c.teamB)}`}
                onClick={() => onPick(c.matchId)}
              >
                Pick this
              </Button>
            </article>
          ))}
        </div>
        {!atEnd ? (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-14 bg-gradient-to-l from-bg to-transparent"
          />
        ) : null}
      </div>
      {candidates.length > 1 ? (
        <Button
          size="sm"
          className="shrink-0 px-2 text-[22px]"
          aria-label="Next match"
          disabled={isPending || index >= candidates.length - 1}
          onClick={() => scrollTo(index + 1)}
        >
          ›
        </Button>
      ) : null}
    </div>
  )
}

/** Offers up to five ready matches, one per scrollable card. */
export function NextMatchSheet({
  open,
  courtLabel,
  matchNo,
  candidates,
  onPick,
  onSkip,
  isPending = false,
  error,
}: NextMatchSheetProps) {
  const shown = candidates.slice(0, 5)
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next && !isPending) onSkip()
      }}
      title={`Next on ${courtLabel}`}
      footer={
        <Button onClick={onSkip} disabled={isPending}>
          {shown.length ? 'Skip for now' : 'Close'}
        </Button>
      }
      fullscreen
      dismissible={!isPending}
      hideClose={isPending}
    >
      <p className="m-0 text-[13px] text-fg2">
        Match {matchNo} is done. Pick the match that goes on next. It goes on court getting ready;
        you start it from the court.
      </p>
      {error ? <Notice tone="error">{error}</Notice> : null}
      {shown.length === 0 ? (
        <Notice>No ready match for {courtLabel} right now.</Notice>
      ) : (
        <>
          <MatchSlider
            key={JSON.stringify([
              open,
              courtLabel,
              matchNo,
              shown.map((c) => [c.matchId, c.position]),
            ])}
            candidates={shown}
            courtLabel={courtLabel}
            onPick={onPick}
            isPending={isPending}
          />
          <p className="m-0 text-[13px] text-fg2">
            Only matches that can go on right now. The number on each face is that player's games so
            far.
            {shown.length > 1
              ? ' Drag, swipe or use the arrows to see the next one. Up to 5 are shown.'
              : ''}
          </p>
        </>
      )}
    </Sheet>
  )
}
