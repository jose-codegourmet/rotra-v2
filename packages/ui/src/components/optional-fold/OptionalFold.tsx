'use client'

import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'
import { type ReactNode, useEffect, useRef, useState } from 'react'

export type OptionalFoldProps = {
  /** Heading line; the prototype's "Optional · add now or later" */
  title?: string
  /** Small line under the heading, e.g. "Nickname, experience and links, prefilled from your club" */
  summary: ReactNode
  /** Opens the fold by itself (and keeps it open) when a child field has an error */
  hasError?: boolean
  /** Initial state when there is no error */
  defaultOpen?: boolean
  className?: string
  children: ReactNode
}

/** The prototypes' .ob-more: a folded card that holds the optional fields of Your details. */
export function OptionalFold({
  title = 'Optional · add now or later',
  summary,
  hasError = false,
  defaultOpen = false,
  className,
  children,
}: OptionalFoldProps) {
  const [open, setOpen] = useState(defaultOpen || hasError)
  const seenError = useRef(hasError)
  useEffect(() => {
    if (hasError && !seenError.current) setOpen(true)
    seenError.current = hasError
  }, [hasError])

  return (
    <details
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className={cn(
        'group flex min-w-0 flex-col gap-4 rounded-lg border border-border bg-surface p-4 shadow-card',
        className,
      )}
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 flex-col gap-1">
          <b className="text-[15px]">{title}</b>
          <span className="text-[13px] text-fg2">{summary}</span>
        </span>
        <span className="shrink-0 text-fg2 transition-transform group-open:rotate-90">
          <Icon name="forward" />
        </span>
      </summary>
      <div className="flex flex-col gap-3.5">{children}</div>
    </details>
  )
}
