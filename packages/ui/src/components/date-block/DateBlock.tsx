import { cn } from '@rotra/ui/cn'

export type DateBlockProps = {
  /** The session's start (epoch ms); shown as the day number over the short month */
  at: number
  /** `lg`: the Next up card's 64 px block */
  size?: 'md' | 'lg'
  className?: string
}

/** The prototype's .dblk: a small calendar-page block (day number over the month) for session rows. */
export function DateBlock({ at, size = 'md', className }: DateBlockProps) {
  const d = new Date(at)
  return (
    <span
      aria-hidden
      className={cn(
        'flex flex-none flex-col items-center justify-center rounded-md border border-border bg-surface',
        size === 'lg' ? 'size-16' : 'size-[52px]',
        className,
      )}
    >
      <b className={cn('leading-none tabular-nums', size === 'lg' ? 'text-2xl' : 'text-lg')}>
        {d.getDate()}
      </b>
      <span className="mt-0.5 text-[11px] tracking-[0.5px] text-fg2 uppercase">
        {d.toLocaleDateString([], { month: 'short' })}
      </span>
    </span>
  )
}

/** "Thu, Nov 13" (the year is added when the date is more than about ten months away), as the prototype's fmtDay. */
export function formatSessionDay(at: number, now = Date.now()) {
  return new Date(at).toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: Math.abs(now - at) > 300 * 864e5 ? 'numeric' : undefined,
  })
}

/** "Thu, Nov 13 · 7:00 PM–10:00 PM" */
export function formatSessionWhen(startsAt: number, endsAt: number, now = Date.now()) {
  const time = (at: number) =>
    new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return `${formatSessionDay(startsAt, now)} · ${time(startsAt)}–${time(endsAt)}`
}
