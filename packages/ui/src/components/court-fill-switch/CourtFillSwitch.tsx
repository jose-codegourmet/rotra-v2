import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'
import { IconButton } from '@rotra/ui/icon-button'
import { Switch } from '@rotra/ui/switch'
import type { ReactNode } from 'react'

/** The session's court filling: Manual Queue (default) or Auto Queue. Proposed code name `CourtFillMode`. */
export type CourtFillMode = 'manual' | 'auto'

export type CourtFillSwitchProps = {
  /** Every session starts on 'manual' */
  value: CourtFillMode
  onChange: (mode: CourtFillMode) => void
  /** Opens How courts get matches (CourtFillInfoSheet); the ⓘ button shows only when it is passed */
  onOpenInfo?: () => void
  /** Sits on the right of the row: the Court layout switch (Grid / Slide) */
  trailing?: ReactNode
  className?: string
}

const HELPER: Record<CourtFillMode, string> = {
  manual: 'You put each match on a court.',
  auto: 'Free courts get the next ready match. You still start each one.',
}

/**
 * The Courts header row: bold "Auto Queue", a switch (on = Auto Queue, off = Manual Queue), an ⓘ that
 * opens How courts get matches, and the layout switch on the right; the helper line sits under it.
 * Auto Queue only puts the next ready match On court; it never starts a match. The prototype's
 * `.fill-sw` row.
 */
export function CourtFillSwitch({
  value,
  onChange,
  onOpenInfo,
  trailing,
  className,
}: CourtFillSwitchProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-nowrap items-center gap-2.5">
          <b className="text-sm">Auto Queue</b>
          <Switch
            aria-label="Auto Queue"
            checked={value === 'auto'}
            onChange={(checked) => onChange(checked ? 'auto' : 'manual')}
          />
          {onOpenInfo ? (
            <IconButton variant="ghost" size="xs" label="How Auto Queue works" onClick={onOpenInfo}>
              <Icon name="info" />
            </IconButton>
          ) : null}
        </div>
        {trailing ? <div className="ml-auto flex-none">{trailing}</div> : null}
      </div>
      <p className="text-[13px] text-fg2" aria-live="polite">
        {HELPER[value]}
      </p>
    </div>
  )
}
