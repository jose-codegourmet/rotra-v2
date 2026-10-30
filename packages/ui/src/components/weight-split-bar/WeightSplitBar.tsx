import { cn } from '@rotra/ui/cn'

export type WeightSplitBarProps = {
  /** Club assessment weight, whole percent */
  assessment: number
  /** Match performance weight, whole percent */
  performance: number
  className?: string
}

/**
 * The prototype's .split: the assessment and performance shares of the rank as two segments. The
 * segments are drawn only when the weights total exactly 100; otherwise the track stays empty.
 */
export function WeightSplitBar({ assessment, performance, className }: WeightSplitBarProps) {
  return (
    <div
      role="img"
      aria-label={`Assessment ${assessment} percent, performance ${performance} percent`}
      className={cn('flex h-3 gap-0.5 overflow-hidden rounded-full bg-elev', className)}
    >
      {assessment + performance === 100 ? (
        <>
          <span className="block bg-accent" style={{ width: `${assessment}%` }} />
          <span
            className="block bg-[color-mix(in_srgb,var(--accent)_35%,var(--elev))]"
            style={{ width: `${performance}%` }}
          />
        </>
      ) : null}
    </div>
  )
}
