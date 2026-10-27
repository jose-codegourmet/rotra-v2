import { cn } from '@rotra/ui/cn'
import type { ReactNode } from 'react'

export type ListRowProps = {
  /** Usually an Avatar or Icon */
  leading?: ReactNode
  title: ReactNode
  /** Muted line under the title */
  subtitle?: ReactNode
  /** Chips, a count or a button at the end of the row */
  trailing?: ReactNode
  /** Makes the whole row a button (the prototypes' .li.click) */
  onClick?: () => void
  /** Cut long titles to one line with an ellipsis; the full text stays available as a tooltip */
  truncate?: boolean
  className?: string
}

/**
 * The prototypes' .li: one row of a list with an optional picture, a title and subtitle, and trailing
 * content. Put rows in a parent with `divide-y divide-border` to get the .list separators.
 */
export function ListRow({
  leading,
  title,
  subtitle,
  trailing,
  onClick,
  truncate,
  className,
}: ListRowProps) {
  const fullText = truncate && typeof title === 'string' ? title : undefined
  const body = (
    <>
      {leading}
      <span className="flex min-w-0 flex-1 flex-col">
        <b
          title={fullText}
          className={cn('font-semibold', truncate ? 'truncate' : '[overflow-wrap:anywhere]')}
        >
          {title}
        </b>
        {subtitle ? <span className="text-[13px] text-fg2">{subtitle}</span> : null}
      </span>
      {trailing ? <span className="flex flex-none items-center gap-2">{trailing}</span> : null}
    </>
  )
  const rowClass = cn('flex w-full min-w-0 items-center gap-3 py-3 text-left', className)
  if (!onClick) return <div className={rowClass}>{body}</div>
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(rowClass, 'border-0 bg-transparent px-0 hover:bg-elev/60')}
    >
      {body}
    </button>
  )
}
