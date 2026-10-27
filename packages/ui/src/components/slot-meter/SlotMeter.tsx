import { cn } from '@rotra/ui/cn'
import { slotMeterBarVariants } from './SlotMeter.variants'

export type SlotMeterProps = {
  rosterCount: number
  capacity: number
  waitlistCount?: number
  className?: string
}

/** "14/24 slots · 10 left before the waitlist" with a bar; amber near or at the budget. */
export function SlotMeter({ rosterCount, capacity, waitlistCount = 0, className }: SlotMeterProps) {
  const open = capacity - rosterCount
  const state = open < 0 ? 'over' : open === 0 ? 'full' : open <= 2 ? 'near' : 'ok'
  const text =
    open > 0
      ? `${open} left before the waitlist`
      : open === 0
        ? 'Full · new players go on the waitlist'
        : `${-open} over budget · new players go on the waitlist`
  return (
    <div
      className={cn(
        'flex flex-col gap-1.5 rounded-lg border border-border bg-bg px-3 py-2.5',
        className,
      )}
    >
      <div className="flex flex-wrap items-baseline gap-2 text-[13px] text-fg2">
        <b className="text-xl text-fg tabular-nums">
          {rosterCount}/{capacity}
        </b>
        <span className={cn(state !== 'ok' && state !== 'near' && 'font-semibold text-warn')}>
          slots · {text}
          {waitlistCount ? ` · ${waitlistCount} on the waitlist` : ''}
        </span>
      </div>
      {/* biome-ignore lint/a11y/useSemanticElements: a native <meter> cannot take the prototype's bar styling */}
      <div
        role="meter"
        aria-valuemin={0}
        aria-valuemax={capacity}
        aria-valuenow={Math.min(rosterCount, capacity)}
        aria-label={`Slots used: ${rosterCount} of ${capacity}`}
        className="h-1.5 overflow-hidden rounded-full bg-elev"
      >
        <i
          className={slotMeterBarVariants({ state })}
          style={{ width: `${Math.min(100, capacity ? (rosterCount / capacity) * 100 : 100)}%` }}
        />
      </div>
    </div>
  )
}
