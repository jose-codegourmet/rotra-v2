import { cn } from '@rotra/ui/cn'

export type ActivityLogEntry = {
  id: string
  /** Bold words before the text ("Version 2") */
  lead?: string
  text: string
  at: Date | string
  /** Who did it: the Admin's email */
  actor: string
}

export type ActivityLogProps = {
  /** Newest first */
  entries: ActivityLogEntry[]
  /** Shown instead of the list when there are no entries */
  emptyText: string
  className?: string
}

const WHEN = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'Asia/Manila',
})

/** A record of who did what and when: Record of actions, Recently decided, Versions. */
export function ActivityLog({ entries, emptyText, className }: ActivityLogProps) {
  if (entries.length === 0) {
    return <p className={cn('m-0 text-[13px] text-fg2', className)}>{emptyText}</p>
  }
  return (
    <ul className={cn('m-0 flex list-none flex-col p-0', className)}>
      {entries.map((entry) => (
        <li
          key={entry.id}
          className="flex flex-col gap-px border-t border-border py-2.5 text-[13px] [overflow-wrap:anywhere] first:border-t-0 first:pt-0"
        >
          <span>
            {entry.lead ? <b>{entry.lead}</b> : null}
            {entry.lead ? ' ' : null}
            {entry.text}
          </span>
          <span className="text-xs text-fg2">
            {WHEN.format(new Date(entry.at))} · {entry.actor}
          </span>
        </li>
      ))}
    </ul>
  )
}
