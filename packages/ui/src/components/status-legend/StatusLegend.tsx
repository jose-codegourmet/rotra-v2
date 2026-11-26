import { cn } from '@rotra/ui/cn'
import { StatusPill, type StatusPillValue } from '@rotra/ui/status-pill'

export type StatusLegendProps = {
  className?: string
}

/** Each key: the real coloured pill icon, then its words (the prototype's .st-legend order). */
const KEYS: { status: StatusPillValue; label: string }[] = [
  { status: { kind: 'wait', minutes: 0 }, label: 'Free, waiting' },
  { status: { kind: 'queued', minutes: 0 }, label: 'In queue' },
  { status: { kind: 'ready', courtLabel: 'a court' }, label: 'Getting ready' },
  { status: { kind: 'playing', minutes: 0, courtLabel: 'a court' }, label: 'Playing' },
  { status: { kind: 'away' }, label: 'Away' },
]

/**
 * The prototype's .st-legend strip above the Players cards: "Status", then each key as the real
 * coloured pill icon with its words in normal text. Bordered on the surface, wraps on phones, and
 * hidden from screen readers (each pill already carries its full words).
 */
export function StatusLegend({ className }: StatusLegendProps) {
  return (
    <div
      aria-hidden
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-2 rounded-sm border border-border-strong bg-surface px-3 py-2 text-[13px] text-fg',
        className,
      )}
    >
      <b className="text-[11px] font-bold tracking-[0.5px] text-fg2 uppercase">Status</b>
      {KEYS.map(({ status, label }) => (
        <span key={label} className="inline-flex items-center gap-1.5 font-semibold">
          <StatusPill status={status} iconOnly />
          {label}
        </span>
      ))}
    </div>
  )
}
