import { cn } from '@rotra/ui/cn'

export type ValueTile = {
  id: string
  label: string
  value: string
  /** Small muted line under the value */
  sub?: string
  /** Numbers and prices in mono; words in bold */
  mono?: boolean
}

export type ValueTilesProps = {
  tiles: ValueTile[]
  className?: string
}

/** A row of labelled values (prices, weights in effect) that wraps into as many columns as fit. */
export function ValueTiles({ tiles, className }: ValueTilesProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-[repeat(auto-fit,minmax(min(100%,150px),1fr))] gap-2.5',
        className,
      )}
    >
      {tiles.map((tile) => (
        <div
          key={tile.id}
          className="flex min-w-0 flex-col gap-0.5 rounded-md border border-border px-3 py-2.5"
        >
          <span className="text-xs font-semibold tracking-[0.5px] text-fg2 uppercase">
            {tile.label}
          </span>
          {tile.mono ? (
            <span className="font-mono text-xl font-semibold [overflow-wrap:anywhere]">
              {tile.value}
            </span>
          ) : (
            <b className="text-[17px] [overflow-wrap:anywhere]">{tile.value}</b>
          )}
          {tile.sub ? <span className="text-[13px] text-fg2">{tile.sub}</span> : null}
        </div>
      ))}
    </div>
  )
}
