import { cn } from '@rotra/ui/cn'

export type SkeletonProps = {
  /** Tailwind width/height classes, e.g. "w-28 h-3.5" (default height is one text line) */
  className?: string
  /** Names a loading region; other purely decorative bars omit this. */
  label?: string
}

/**
 * The player prototype's .skel: a grey bar that pulses while content loads. It carries no fake names
 * or numbers. Put aria-busy and an aria-label ("Loading the leaderboard") on the container.
 */
export function Skeleton({ className, label }: SkeletonProps) {
  const classes = cn(
    'block h-3.5 rounded-md bg-elev animate-[pulse_1.2s_infinite] motion-reduce:animate-none',
    className,
  )
  return label ? (
    <span role="status" aria-label={label} aria-busy className={classes} />
  ) : (
    <span aria-hidden className={classes} />
  )
}
