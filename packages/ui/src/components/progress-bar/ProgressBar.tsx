import { cn } from '@rotra/ui/cn'

export type ProgressBarProps = {
  value: number
  max?: number
  /** Names the bar for screen readers, e.g. "Games played: 3 of 4" */
  'aria-label': string
  tone?: 'accent' | 'warn'
  /** 6 px in Queue cards, 8 px in Player and Admin */
  size?: 'sm' | 'md'
  className?: string
}

/** The prototypes' .prog: a rounded determinate bar (games against the minimum, license time). */
export function ProgressBar({
  value,
  max = 100,
  tone = 'accent',
  size = 'md',
  className,
  ...aria
}: ProgressBarProps) {
  const clamped = Math.min(Math.max(value, 0), max)
  const percent = max > 0 ? (clamped / max) * 100 : 0
  return (
    <div
      role="progressbar"
      aria-label={aria['aria-label']}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={clamped}
      className={cn(
        'w-full overflow-hidden rounded-full bg-elev',
        size === 'sm' ? 'h-1.5' : 'h-2',
        className,
      )}
    >
      <i
        className={cn('block h-full rounded-full', tone === 'warn' ? 'bg-warn' : 'bg-accent')}
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}
