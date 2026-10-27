import { cn } from '@rotra/ui/cn'
import type { ReactNode } from 'react'

export type PageHeaderProps = {
  title: ReactNode
  /** Muted paragraph under the title (kept to about 68 characters per line) */
  description?: ReactNode
  /** Above the title: a label and chips, e.g. "Live session · Fair · Doubles" */
  eyebrow?: ReactNode
  /** Buttons for the page; on phones they become a two-column grid (an odd last one spans both) */
  actions?: ReactNode
  className?: string
}

/** The prototypes' .page-head: page title, description and the page's actions. */
export function PageHeader({ title, description, eyebrow, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3', className)}>
      <div className="flex min-w-0 flex-col gap-1.5">
        {eyebrow ? <div className="flex flex-wrap items-center gap-2">{eyebrow}</div> : null}
        <h1 className="[overflow-wrap:anywhere]">{title}</h1>
        {description ? <p className="m-0 max-w-[68ch] text-fg2">{description}</p> : null}
      </div>
      {actions ? (
        <div
          className={cn(
            'flex flex-wrap items-center gap-2',
            'max-[640px]:grid max-[640px]:w-full max-[640px]:grid-cols-2 max-[640px]:[&>*]:w-full',
            'max-[640px]:[&>*:last-child:nth-child(odd)]:col-span-2',
          )}
        >
          {actions}
        </div>
      ) : null}
    </div>
  )
}
