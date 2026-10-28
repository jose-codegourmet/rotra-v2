import { cn } from '@rotra/ui/cn'
import type { ReactNode } from 'react'

export type RecordTabHeaderProps = {
  /** "Standings", "How the night ran", "Players" */
  title: string
  /** Muted copy under the title */
  description?: ReactNode
  /** Muted text on the right, e.g. "Minimum 4 games · 2 below it" */
  aside?: ReactNode
  /** Small buttons on the right, e.g. Result slides and Download images */
  actions?: ReactNode
  className?: string
}

/**
 * The heading row of a session record tab panel (the prototype's `.between` with an h2): the title
 * and optional muted copy on the left, and either muted text or small actions on the right. Wraps
 * on phones so the actions drop under the title.
 */
export function RecordTabHeader({
  title,
  description,
  aside,
  actions,
  className,
}: RecordTabHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3', className)}>
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="[overflow-wrap:anywhere]">{title}</h2>
        {description ? <p className="m-0 max-w-[68ch] text-[13px] text-fg2">{description}</p> : null}
      </div>
      {aside ? <span className="text-[13px] text-fg2">{aside}</span> : null}
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
