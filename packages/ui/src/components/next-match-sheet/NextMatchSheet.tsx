'use client'

import { Button } from '@rotra/ui/button'
import { Chip } from '@rotra/ui/chip'
import { cn } from '@rotra/ui/cn'
import { useMediaQuery } from '@rotra/ui/hooks/use-media-query'
import { Notice } from '@rotra/ui/notice'
import { Sheet } from '@rotra/ui/sheet'
import {
  type KeyboardEvent,
  type PointerEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useRef,
  useState,
} from 'react'

/** One waiting match the picker offers for the freed court */
export type NextMatchCandidate = {
  matchId: string
  /** Main Queue position P, shown as "#P" */
  position: number
  /** Team A by short names, e.g. "Mikee and Dexter" */
  teamA: string
  /** Team B by short names, e.g. "Jose and Aaron" */
  teamB: string
  /** "Doubles", "1v2 fun" */
  formatLabel: string
}

export type NextMatchSheetProps = {
  open: boolean
  /** The court the finished match freed, e.g. "Court 2" */
  courtLabel: string
  /** The finished match's number, for "Match N is done." */
  matchNo: number
  /** At most two, in Main Queue order; none shows the honest notice and only Close */
  candidates: NextMatchCandidate[]
  /** Pick this (or a committed swipe): put that match On court on this court */
  onPick: (matchId: string) => void
  /** Skip for now, Close, Escape and the scrim: the picker places nothing */
  onSkip: () => void
  /** The placement is running: the controls are disabled and the sheet cannot be dismissed */
  isPending?: boolean
  /** e.g. "That match is not ready any more. Pick again." */
  error?: ReactNode
}

/** Swipe commit: |dx| at least 96 px, or 30% of the pair's width if that is smaller */
const COMMIT_PX = 96
const COMMIT_SHARE = 0.3
/** Horizontal must dominate vertical by this factor, or the gesture is a scroll */
const DOMINANCE = 1.5
/** Movement before a gesture is read as a drag (so a tap on Pick this stays a tap) */
const SLOP_PX = 8
const MAX_ROTATE_DEG = 6
const SNAP_MS = 150

type Drag = { id: number; x: number; y: number; dx: number; dy: number; horizontal: boolean }

/**
 * Q-NEXT-MATCH: after Confirm result, "Next on Court X" offers the first two ready waiting matches
 * for the freed court as two equal cards, Left and Right. Pick this puts that match On court
 * (getting ready, never started); Skip for now (or closing) places nothing. On coarse pointers with
 * two candidates the pair can be swiped toward the card you want; buttons always work, and the
 * Left/Right arrow keys move focus between the two Pick this buttons.
 */
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
  const coarse = useMediaQuery('(pointer: coarse)')
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const pair = candidates.length === 2
  const swipe = coarse && pair && !isPending
  const shown = candidates.slice(0, 2)

  const pairRef = useRef<HTMLDivElement>(null)
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const drag = useRef<Drag | null>(null)
  // A committed or abandoned drag must not also land as a click on the button under the finger.
  const dragged = useRef(false)
  const [offset, setOffset] = useState<{ dx: number; active: boolean }>({ dx: 0, active: false })

  const reset = () => {
    drag.current = null
    setOffset({ dx: 0, active: false })
  }
  const threshold = () => {
    const width = pairRef.current?.getBoundingClientRect().width ?? 0
    return width > 0 ? Math.min(COMMIT_PX, width * COMMIT_SHARE) : COMMIT_PX
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!swipe || !e.isPrimary) return
    dragged.current = false
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, dy: 0, horizontal: false }
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    d.dx = e.clientX - d.x
    d.dy = e.clientY - d.y
    if (!d.horizontal) {
      if (Math.abs(d.dx) < SLOP_PX && Math.abs(d.dy) < SLOP_PX) return
      if (Math.abs(d.dx) <= Math.abs(d.dy) * DOMINANCE) {
        // Vertical: the sheet scrolls, nothing happens here.
        reset()
        return
      }
      d.horizontal = true
      dragged.current = true
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    setOffset({ dx: d.dx, active: true })
  }
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const commit =
      d.horizontal && Math.abs(d.dx) >= threshold() && Math.abs(d.dx) > Math.abs(d.dy) * DOMINANCE
    const side = d.dx < 0 ? 0 : 1
    reset()
    const picked = shown[side]
    if (commit && picked) onPick(picked.matchId)
  }
  const onClickCapture = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!dragged.current) return
    dragged.current = false
    e.preventDefault()
    e.stopPropagation()
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!pair) return
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      buttons.current[0]?.focus()
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      buttons.current[1]?.focus()
    }
  }

  const dx = offset.active ? offset.dx : 0
  const leaning = offset.active && Math.abs(dx) >= SLOP_PX ? (dx < 0 ? 0 : 1) : null
  const rotate = Math.max(-MAX_ROTATE_DEG, Math.min(MAX_ROTATE_DEG, dx / 20))
  const pairStyle =
    swipe && !reduced
      ? {
          transform: `translateX(${dx}px) rotate(${rotate}deg)`,
          transition: offset.active ? 'none' : `transform ${SNAP_MS}ms ease-out`,
        }
      : undefined

  const footer = (
    <Button onClick={onSkip} disabled={isPending}>
      {candidates.length === 0 ? 'Close' : 'Skip for now'}
    </Button>
  )

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next && !isPending) onSkip()
      }}
      title={`Next on ${courtLabel}`}
      footer={footer}
      dismissible={!isPending}
      hideClose={isPending}
    >
      <p className="m-0 text-[13px] text-fg2">
        Match {matchNo} is done. Pick the match that goes on next. It goes on court getting ready;
        you start it from the court.
      </p>
      {error ? <Notice tone="error">{error}</Notice> : null}
      {candidates.length === 0 ? (
        <Notice>No ready match for {courtLabel} right now.</Notice>
      ) : (
        // biome-ignore lint/a11y/noStaticElementInteractions: arrow keys move focus between the Pick this buttons
        <div
          ref={pairRef}
          className={cn(
            'grid gap-2',
            pair ? 'grid-cols-2' : 'grid-cols-1',
            swipe && 'touch-pan-y select-none',
          )}
          style={pairStyle}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={reset}
          onClickCapture={onClickCapture}
          onKeyDown={onKeyDown}
        >
          {shown.map((c, i) => {
            const side = pair ? (i === 0 ? 'Left' : 'Right') : null
            const highlighted = leaning === i
            return (
              <div
                key={c.matchId}
                className={cn(
                  'flex min-w-0 flex-col gap-2 rounded-md border bg-bg p-3',
                  highlighted ? 'scale-[1.02] border-accent' : 'border-border-strong',
                  !reduced && 'transition-[transform,border-color] duration-150',
                )}
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono font-bold">#{c.position}</span>
                  <Chip>{c.formatLabel}</Chip>
                  {side ? <span className="ml-auto text-xs text-fg2">{side}</span> : null}
                </div>
                <div className="flex-1 break-words">
                  <b className="block font-bold">{c.teamA}</b>
                  <span className="block text-fg2">vs</span>
                  <b className="block font-bold">{c.teamB}</b>
                </div>
                <Button
                  ref={(el) => {
                    buttons.current[i] = el
                  }}
                  variant="primary"
                  block
                  disabled={isPending}
                  aria-label={`Put match #${c.position} on ${courtLabel}: ${c.teamA} vs ${c.teamB}`}
                  onClick={() => onPick(c.matchId)}
                >
                  Pick this
                </Button>
              </div>
            )
          })}
        </div>
      )}
      {coarse && pair ? (
        <p className="m-0 text-[13px] text-fg2">Swipe left or right to pick, or tap Pick this.</p>
      ) : null}
    </Sheet>
  )
}
