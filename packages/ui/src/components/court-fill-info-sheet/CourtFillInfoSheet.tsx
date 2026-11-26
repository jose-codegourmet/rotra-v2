'use client'

import { Button } from '@rotra/ui/button'
import { Chip } from '@rotra/ui/chip'
import { cn } from '@rotra/ui/cn'
import type { CourtFillMode } from '@rotra/ui/court-fill-switch'
import { Sheet } from '@rotra/ui/sheet'
import type { ReactNode } from 'react'

export type CourtFillInfoSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The session's current court filling; its card is marked "On now" */
  mode: CourtFillMode
  /** Turn on Auto Queue (from Manual) or Switch to Manual Queue (from Auto); the container closes the sheet */
  onSwitch: (next: CourtFillMode) => void
  /** Set while the change is saving */
  busy?: boolean
}

// The drawings are small inline SVGs on the theme tokens, as in the prototype's fillInfo sheet.
const FRAME = (
  <rect
    x="1"
    y="1"
    width="218"
    height="94"
    rx="10"
    fill="var(--bg)"
    stroke="var(--border-strong)"
  />
)
const QUEUE = (
  <g transform="translate(14 18)">
    <rect width="34" height="14" rx="4" fill="var(--elev)" />
    <rect y="20" width="34" height="14" rx="4" fill="var(--elev)" />
    <rect y="40" width="34" height="14" rx="4" fill="var(--accent-subtle)" stroke="var(--accent)" />
  </g>
)
const COURT = (
  <g transform="translate(140 22)">
    <rect width="66" height="52" rx="4" fill="var(--court)" />
    <path d="M33 0v52M0 26h66" stroke="var(--court-line)" strokeWidth="1.2" />
  </g>
)

function ManualArt() {
  return (
    <svg
      className="block h-auto w-full"
      viewBox="0 0 220 96"
      role="img"
      aria-label="You pick the match and put it on a court"
    >
      {FRAME}
      {QUEUE}
      <path
        d="M60 65 C 95 65, 100 48, 128 48"
        fill="none"
        stroke="var(--fg2)"
        strokeWidth="2.5"
        strokeDasharray="4 4"
        strokeLinecap="round"
      />
      <path
        d="M124 42 l8 6 -8 6"
        fill="none"
        stroke="var(--fg2)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {COURT}
      <g transform="translate(80 16)">
        <circle r="9" fill="var(--elev)" />
        <path
          d="M-3 4V-3a1.5 1.5 0 0 1 3 0v3h3a2 2 0 0 1 2 2v2"
          fill="none"
          stroke="var(--fg)"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </g>
    </svg>
  )
}

function AutoArt() {
  return (
    <svg
      className="block h-auto w-full"
      viewBox="0 0 220 96"
      role="img"
      aria-label="A free court takes the next ready match by itself"
    >
      {FRAME}
      {QUEUE}
      <path
        d="M60 65 C 95 65, 100 48, 128 48"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M124 42 l8 6 -8 6"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {COURT}
      <g transform="translate(78 14)">
        <circle r="9" fill="var(--accent)" />
        <path
          d="M-4 0l3 3 5-6"
          fill="none"
          stroke="var(--on-accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  )
}

function InfoCard({
  title,
  art,
  lines,
  on,
}: {
  title: string
  art: ReactNode
  lines: string[]
  on: boolean
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-[180px_minmax(0,1fr)] items-center gap-3.5 rounded-lg border p-3 max-[560px]:grid-cols-[minmax(0,1fr)]',
        on ? 'border-accent bg-accent-subtle' : 'border-border-strong bg-surface',
      )}
    >
      {art}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <b>{title}</b>
          {on ? <Chip tone="accent">On now</Chip> : null}
        </div>
        <ul className="m-0 flex list-disc flex-col gap-1 pl-[18px] text-sm text-fg2">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/**
 * How courts get matches (Q-FILL-INFO, the ⓘ next to Auto Queue): two cards, Manual Queue (switch
 * off) and Auto Queue (switch on), each with a small drawing and three lines; the current mode's card
 * is highlighted and marked On now. Footer: Close and the primary button that switches.
 */
export function CourtFillInfoSheet({
  open,
  onOpenChange,
  mode,
  onSwitch,
  busy,
}: CourtFillInfoSheetProps) {
  const auto = mode === 'auto'
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="How courts get matches"
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
          <Button
            variant="primary"
            loading={busy}
            onClick={() => onSwitch(auto ? 'manual' : 'auto')}
          >
            {auto ? 'Switch to Manual Queue' : 'Turn on Auto Queue'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <InfoCard
          title="Manual Queue (switch off)"
          art={<ManualArt />}
          on={!auto}
          lines={[
            'You choose which match goes on which court.',
            'Drag a match onto a court, or use Put on court.',
            'Nothing moves until you place it.',
          ]}
        />
        <InfoCard
          title="Auto Queue (switch on)"
          art={<AutoArt />}
          on={auto}
          lines={[
            'When a court frees up, the next ready match in the Main Queue goes on it.',
            'Matches that can’t start yet (a player still on court or away) are skipped until they can.',
            'It only places the match. You still press Start match.',
          ]}
        />
        <p className="m-0 text-[13px] text-fg2">
          Switching doesn’t move matches that are already on a court.
        </p>
      </div>
    </Sheet>
  )
}
