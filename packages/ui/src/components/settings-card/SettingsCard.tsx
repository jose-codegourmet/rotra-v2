import { Card } from '@rotra/ui/card'
import { Chip, type ChipProps } from '@rotra/ui/chip'
import { cn } from '@rotra/ui/cn'
import { KeyValueList } from '@rotra/ui/key-value-list'
import { type ValueTile, ValueTiles } from '@rotra/ui/value-tiles'
import type { ReactNode } from 'react'
import { useId } from 'react'

export type SettingsRow = {
  label: ReactNode
  /** Semi-bold, left-aligned */
  value: ReactNode
  /** Muted line under the value */
  note?: ReactNode
  id?: string
}

export type SettingsCardProps = {
  title: ReactNode
  /** One state chip beside the title, e.g. "Fixed after start" */
  chip?: string
  chipTone?: ChipProps['tone']
  /** A button on the right of the header, e.g. Edit */
  headerAction?: ReactNode
  /** Big-count tiles (Confirmed, Present; Each player pays, Estimated total) */
  tiles?: ValueTile[]
  /** Label and value rows under the tiles (label left, value semi-bold, note under the value) */
  rows?: SettingsRow[]
  /** Free content, e.g. the Notes text */
  children?: ReactNode
  /** Buttons pinned to the bottom of the card, so cards in one grid row line up */
  actions?: ReactNode
  className?: string
}

/**
 * The prototypes' .ls-card on the Settings tab: a title with an optional chip and header action, big
 * count tiles, label-value rows and bottom actions. Fills its grid cell, so cards in one row share a
 * height. Lay four out as a 2×2 grid, one column at 760 px and narrower.
 */
export function SettingsCard({
  title,
  chip,
  chipTone,
  headerAction,
  tiles,
  rows,
  children,
  actions,
  className,
}: SettingsCardProps) {
  const id = useId()
  return (
    <Card asChild className={cn('flex h-full flex-col gap-3', className)}>
      <section aria-labelledby={id}>
        <div className="flex min-h-7 flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h3 id={id} className="m-0 text-[15px]">
              {title}
            </h3>
            {chip ? <Chip tone={chipTone}>{chip}</Chip> : null}
          </div>
          {headerAction}
        </div>
        {tiles?.length ? <ValueTiles tiles={tiles} /> : null}
        {rows?.length ? (
          <KeyValueList
            items={rows.map((row, index) => ({
              id: row.id ?? String(index),
              label: row.label,
              value: (
                <span className="flex flex-col gap-0.5">
                  <b className="font-semibold">{row.value}</b>
                  {row.note ? <span className="text-[13px] text-fg2">{row.note}</span> : null}
                </span>
              ),
            }))}
          />
        ) : null}
        {children}
        {actions ? (
          <div className="mt-auto flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </section>
    </Card>
  )
}
