import { cn } from '@rotra/ui/cn'
import type { ReactNode } from 'react'

export type KeyValueItem = {
  label: ReactNode
  value: ReactNode
  /** React key when label is not a string */
  id?: string
}

export type KeyValueListProps = {
  items: KeyValueItem[]
  className?: string
}

/**
 * The prototypes' .kv: muted labels beside their values in two columns; long values wrap, and on
 * narrow phones (≤ 420 px) each label sits above its value.
 */
export function KeyValueList({ items, className }: KeyValueListProps) {
  return (
    <dl
      className={cn(
        'm-0 grid grid-cols-[max-content_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm',
        'max-[420px]:grid-cols-[minmax(0,1fr)] max-[420px]:gap-y-0',
        className,
      )}
    >
      {items.map((item, index) => (
        <div
          key={item.id ?? (typeof item.label === 'string' ? item.label : index)}
          className="contents"
        >
          <dt className="text-fg2">{item.label}</dt>
          <dd className="m-0 min-w-0 [overflow-wrap:anywhere] max-[420px]:mb-2">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
