'use client'

import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { Chip } from '@rotra/ui/chip'
import type { CourtPlayer } from '@rotra/ui/court-drawing'
import { useMediaQuery } from '@rotra/ui/hooks/use-media-query'
import { Notice } from '@rotra/ui/notice'
import { Sheet } from '@rotra/ui/sheet'
import { type PointerEvent, type ReactNode, useRef, useState } from 'react'

/** One waiting match the picker offers for the freed court. Strings support the existing console until it is wired to player lists. */
export type NextMatchCandidate = {
  matchId: string
  position: number
  teamA: CourtPlayer[] | string
  teamB: CourtPlayer[] | string
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

function Team({ players }: { players: CourtPlayer[] | string }) {
  if (typeof players === 'string') return <span className="font-bold">{players}</span>
  return <div className="flex flex-wrap justify-center gap-2">{players.map((player) => (
    <div key={player.id} className="flex flex-col items-center gap-1" aria-label={`${player.name}, ${player.games ?? 0} games played`}>
      <span className="relative"><Avatar name={player.name} src={player.photoUrl} size={36} /><span aria-hidden className="absolute -top-1 -right-1 grid size-[18px] place-items-center rounded-full bg-on-photo text-[10px] font-extrabold text-bg">{player.games ?? 0}</span></span>
      <span className="text-xs font-bold">{player.shortName}</span>
    </div>
  ))}</div>
}

/** Offers up to five ready matches, one per scrollable card. */
export function NextMatchSheet({ open, courtLabel, matchNo, candidates, onPick, onSkip, isPending = false, error }: NextMatchSheetProps) {
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const shown = candidates.slice(0, 5)
  const slider = useRef<HTMLDivElement>(null)
  const drag = useRef<{ id: number; x: number; left: number; moved: boolean } | null>(null)
  const suppressClick = useRef(false)
  const [index, setIndex] = useState(0)
  const scrollTo = (i: number) => {
    const el = slider.current
    if (!el) return
    el.scrollTo({ left: Math.max(0, Math.min(i, shown.length - 1)) * el.clientWidth, behavior: reduced ? 'instant' : 'smooth' })
  }
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch' || isPending || !e.isPrimary) return
    drag.current = { id: e.pointerId, x: e.clientX, left: e.currentTarget.scrollLeft, moved: false }
  }
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const dx = e.clientX - d.x
    if (Math.abs(dx) > 6 && !d.moved) { d.moved = true; e.currentTarget.setPointerCapture(e.pointerId) }
    if (d.moved) e.currentTarget.scrollLeft = d.left - dx
  }
  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    drag.current = null
    if (d.moved) { suppressClick.current = true; setTimeout(() => { suppressClick.current = false }, 0); scrollTo(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth)) }
  }
  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next && !isPending) onSkip() }} title={`Next on ${courtLabel}`} footer={<Button onClick={onSkip} disabled={isPending}>{shown.length ? 'Skip for now' : 'Close'}</Button>} fullscreen dismissible={!isPending} hideClose={isPending}>
      <p className="m-0 text-[13px] text-fg2">Match {matchNo} is done. Pick the match that goes on next. It goes on court getting ready; you start it from the court.</p>
      {error ? <Notice tone="error">{error}</Notice> : null}
      {shown.length === 0 ? <Notice>No ready match for {courtLabel} right now.</Notice> : <>
        <p className="m-0 text-[13px] text-fg2">Only matches that can go on right now. The number on each face is that player's games so far.</p>
        <div className="relative min-w-0">
          <div ref={slider} className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]" onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => { drag.current = null }} onClickCapture={(e) => { if (suppressClick.current) { e.preventDefault(); e.stopPropagation(); suppressClick.current = false } }}>
            {shown.map((c, i) => <div key={c.matchId} className="w-full shrink-0 snap-start rounded-md border border-border-strong bg-bg p-3">
              <div className="flex items-center gap-1.5"><span className="font-mono font-bold">#{c.position}</span><Chip>{c.formatLabel}</Chip>{i === 0 ? <span className="text-xs text-fg2">Next in line</span> : null}<span className="ml-auto text-xs text-fg2">{i + 1} of {shown.length}</span></div>
              <div className="flex items-center justify-center gap-3 py-5"><Team players={c.teamA} /><span className="text-xs font-bold text-fg2">VS</span><Team players={c.teamB} /></div>
              <Button variant="primary" block disabled={isPending} onClick={() => onPick(c.matchId)}>Pick this</Button>
            </div>)}
          </div>
          {shown.length > 1 && index < shown.length - 1 ? <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-bg to-transparent" /> : null}
        </div>
        {shown.length > 1 ? <div className="flex items-center justify-center gap-2"><Button aria-label="Previous match" disabled={isPending || index === 0} onClick={() => scrollTo(index - 1)}>‹</Button><Button aria-label="Next match" disabled={isPending || index >= shown.length - 1} onClick={() => scrollTo(index + 1)}>›</Button></div> : null}
        <p className="m-0 text-[13px] text-fg2">Drag, swipe or use the arrows to see the next one. Up to 5 are shown.</p>
      </>}
    </Sheet>
  )
}
