import type { PlayingLevel } from '@rotra/data/player/types'
import { cn } from '@rotra/ui/cn'

export type LevelPillProps = {
  /** One of the nine playing levels, or null when the club has not assessed the player yet */
  level: PlayingLevel | null
  className?: string
}

const BAND_BARS = { beginner: 1, intermediate: 2, advanced: 3 } as const

/** "intermediate_mid" → "Intermediate Mid" */
export function levelLabel(level: PlayingLevel | null): string {
  if (!level) return 'No level yet'
  return level
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * The prototype's .sp-level: three small bars for the band (one Beginner, two Intermediate, three
 * Advanced) beside the full level name.
 */
export function LevelPill({ level, className }: LevelPillProps) {
  const filled = level ? BAND_BARS[level.split('_')[0] as keyof typeof BAND_BARS] : 0
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full bg-bg px-2.5 py-[3px] text-xs font-semibold',
        className,
      )}
    >
      <span aria-hidden className="inline-flex items-end gap-0.5">
        {[6, 9, 12].map((height, i) => (
          <i
            key={height}
            style={{ height }}
            className={cn('w-[3px] rounded-[2px]', i < filled ? 'bg-accent' : 'bg-border-strong')}
          />
        ))}
      </span>
      {levelLabel(level)}
    </span>
  )
}
