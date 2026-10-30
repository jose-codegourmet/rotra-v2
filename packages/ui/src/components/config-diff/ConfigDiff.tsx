import { cn } from '@rotra/ui/cn'

export type ConfigDiffRow = {
  label: string
  from: number
  to: number
  /** Written straight after the number: '%' or ' matches' */
  unit: string
}

export type ConfigDiffProps = {
  rows: ConfigDiffRow[]
  className?: string
}

/**
 * The prototype's .diff in the Save configuration sheet: one row per setting, "{from}{unit}" when it
 * is unchanged or "{from}{unit} → {to}{unit}" when it changes, with changed rows outlined.
 */
export function ConfigDiff({ rows, className }: ConfigDiffProps) {
  return (
    <ul className={cn('m-0 flex list-none flex-col gap-1.5 p-0', className)}>
      {rows.map((row) => {
        const changed = row.from !== row.to
        return (
          <li
            key={row.label}
            className={cn(
              'flex justify-between gap-3 rounded-md border bg-bg px-2.5 py-2 text-sm',
              changed ? 'border-accent' : 'border-border',
            )}
          >
            <span>{row.label}</span>
            <b className="font-mono font-semibold whitespace-nowrap">
              {row.from}
              {row.unit}
              {changed ? ` → ${row.to}${row.unit}` : null}
            </b>
          </li>
        )
      })}
    </ul>
  )
}
