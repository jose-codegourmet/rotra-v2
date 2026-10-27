import { cn } from '@rotra/ui/cn'
import type { ReactNode } from 'react'

export type EmptyStateProps = {
  /** What is missing, e.g. "No clubs match." */
  title?: ReactNode
  /** Why, and what will make something appear */
  children?: ReactNode
  /** The one next action this audience is allowed to take */
  action?: ReactNode
  className?: string
}

/** The prototypes' .empty: a centered, muted explanation with at most one next action. */
export function EmptyState({ title, children, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-1.5 px-3 py-7 text-center text-sm text-fg2',
        className,
      )}
    >
      {title ? <b className="text-[15px] text-fg">{title}</b> : null}
      {children ? <span>{children}</span> : null}
      {action ? <div className="mt-1.5">{action}</div> : null}
    </div>
  )
}
