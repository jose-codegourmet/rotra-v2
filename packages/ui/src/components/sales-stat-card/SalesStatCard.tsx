import { BarChart, type BarChartBar } from '@rotra/ui/bar-chart'
import { Card } from '@rotra/ui/card'
import { Chip } from '@rotra/ui/chip'
import { useId } from 'react'

/** How this period compares with the one before it. */
export type SalesChange =
  | { kind: 'up'; percent: number }
  | { kind: 'down'; percent: number }
  /** Both periods have no change (0%) or both are empty */
  | { kind: 'same' }
  /** The earlier period had nothing to compare with */
  | { kind: 'new' }
  /** The earlier period starts before the first recorded license */
  | { kind: 'no-history' }

export type SalesStatCardProps = {
  /** Revenue, Sessions started, Matches played */
  label: string
  /** The total for the period, already formatted (e.g. "₱16,500", "42") */
  value: string
  change?: SalesChange
  /** The period's bars (oldest first); the chart is hidden when omitted */
  bars?: BarChartBar[]
  /** Names the chart, e.g. "Revenue per day" */
  chartLabel?: string
  /** Small muted line under the value, used when there is no chart (club Sales summary) */
  note?: string
}

function changeChip(change: SalesChange) {
  switch (change.kind) {
    case 'up':
      return <Chip tone="accent">{`▲ ${change.percent}% vs the period before`}</Chip>
    case 'down':
      return <Chip tone="warn">{`▼ ${change.percent}% vs the period before`}</Chip>
    case 'same':
      return <Chip>No change</Chip>
    case 'new':
      return <Chip>New</Chip>
    case 'no-history':
      return <Chip>Not enough history to compare</Chip>
  }
}

/** The prototype's .sl-kpi: a label, a big total, a change chip and a small bar chart of the period. */
export function SalesStatCard({
  label,
  value,
  change,
  bars,
  chartLabel,
  note,
}: SalesStatCardProps) {
  const labelId = useId()
  return (
    <Card asChild>
      <section aria-labelledby={labelId} className="flex min-w-0 flex-col gap-2">
        <span id={labelId} className="text-xs font-semibold tracking-[0.5px] text-fg2 uppercase">
          {label}
        </span>
        <b className="text-[30px] leading-[1.1] font-extrabold tabular-nums">{value}</b>
        {change ? (
          <div className="flex flex-wrap items-center gap-2">{changeChip(change)}</div>
        ) : null}
        {note ? <span className="text-[13px] text-fg2">{note}</span> : null}
        {bars ? <BarChart bars={bars} aria-label={chartLabel ?? label} /> : null}
      </section>
    </Card>
  )
}
