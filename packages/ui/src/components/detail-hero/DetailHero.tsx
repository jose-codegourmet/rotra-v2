import { cn } from '@rotra/ui/cn'
import type { ReactNode } from 'react'

export type DetailHeroProps = {
  /** ClubLogo size="lg" or Avatar size={52} */
  media: ReactNode
  /** The record's name; the page's h1. Long names wrap anywhere. */
  title: string
  /** The row under the title: chips, a live dot, a mono ID */
  meta?: ReactNode
  className?: string
}

/** The top of an Admin detail page: picture, name and a row of state chips. */
export function DetailHero({ media, title, meta, className }: DetailHeroProps) {
  return (
    <div className={cn('flex min-w-0 items-center gap-3.5', className)}>
      {media}
      <div className="flex min-w-0 flex-col gap-1.5">
        <h1 className="[overflow-wrap:anywhere]">{title}</h1>
        {meta ? <div className="flex flex-wrap items-center gap-2">{meta}</div> : null}
      </div>
    </div>
  )
}
