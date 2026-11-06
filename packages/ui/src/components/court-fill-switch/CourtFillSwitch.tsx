import { cn } from '@rotra/ui/cn'
import { SegmentedControl } from '@rotra/ui/segmented-control'

/** The session's court filling: Manual Queue (default) or Auto Queue. Proposed code name `CourtFillMode`. */
export type CourtFillMode = 'manual' | 'auto'

export type CourtFillSwitchProps = {
  /** Every session starts on 'manual' */
  value: CourtFillMode
  onChange: (mode: CourtFillMode) => void
  className?: string
}

const HELPER: Record<CourtFillMode, string> = {
  manual: 'You put each match on a court.',
  auto: 'Free courts get the next ready match. You still start each one.',
}

/**
 * The Courts header switch Manual Queue | Auto Queue, with its helper line. Auto Queue only puts the
 * next ready match On court; it never starts a match. The prototype's "Court filling" .seg.
 */
export function CourtFillSwitch({ value, onChange, className }: CourtFillSwitchProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <SegmentedControl
        aria-label="Court filling"
        value={value}
        onChange={(next) => onChange(next === 'auto' ? 'auto' : 'manual')}
        options={[
          { value: 'manual', label: 'Manual Queue' },
          { value: 'auto', label: 'Auto Queue' },
        ]}
      />
      <p className="text-[13px] text-fg2" aria-live="polite">
        {HELPER[value]}
      </p>
    </div>
  )
}
