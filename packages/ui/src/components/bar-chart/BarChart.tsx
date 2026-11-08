import { cn } from '@rotra/ui/cn'

export type BarChartBar = {
  id: string
  /** The bar's value; 0 draws the shortest bar */
  value: number
  /** The value as text, for the hover title and the chart's description (e.g. "₱1,500") */
  valueLabel: string
  /** Shown under the bar in the "labeled" variant (e.g. "Jan") */
  label?: string
  /** Hover title; defaults to the value text */
  title?: string
}

export type BarChartProps = {
  bars: BarChartBar[]
  /** Names the chart for screen readers, e.g. "Revenue per day" */
  'aria-label': string
  /**
   * "spark": a small stretched SVG with no labels, the newest bar at full strength (number cards).
   * "labeled": taller bars with a label under each (club Sales month-by-month chart).
   */
  variant?: 'spark' | 'labeled'
  className?: string
}

/** The prototype's .sl-chart (spark) and .sl-bars (labeled): plain SVG or CSS in the accent colour. */
export function BarChart({ bars, variant = 'spark', className, ...aria }: BarChartProps) {
  const max = Math.max(1, ...bars.map((bar) => bar.value))

  if (variant === 'labeled') {
    return (
      <div
        role="img"
        aria-label={aria['aria-label']}
        className={cn('flex h-[84px] items-end gap-2 pt-1.5', className)}
      >
        {bars.map((bar) => (
          <span
            key={bar.id}
            title={bar.title ?? `${bar.label ? `${bar.label}: ` : ''}${bar.valueLabel}`}
            className="flex h-full min-w-0 flex-1 basis-0 flex-col items-center justify-end gap-1"
          >
            <i
              className="block w-full max-w-11 rounded-t bg-accent opacity-85"
              style={{ height: `${Math.max(2, Math.round((bar.value / max) * 100))}%` }}
            />
            <em className="text-[11px] text-fg2 not-italic">{bar.label}</em>
          </span>
        ))}
      </div>
    )
  }

  const width = 100 / Math.max(1, bars.length)
  return (
    <svg
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      role="img"
      aria-label={`${aria['aria-label']}, highest ${bars.find((bar) => bar.value === max)?.valueLabel ?? ''}`}
      className={cn('block h-14 w-full text-accent', className)}
    >
      {bars.map((bar, index) => {
        const height = (bar.value / max) * 38
        return (
          <rect
            key={bar.id}
            x={(index * width + width * 0.12).toFixed(2)}
            y={(40 - height).toFixed(2)}
            width={(width * 0.76).toFixed(2)}
            height={height.toFixed(2)}
            rx="0.6"
            fill="currentColor"
            opacity={index === bars.length - 1 ? undefined : 0.55}
          >
            <title>{bar.title ?? bar.valueLabel}</title>
          </rect>
        )
      })}
    </svg>
  )
}
