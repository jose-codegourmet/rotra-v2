import { Avatar } from '@rotra/ui/avatar'
import { Card } from '@rotra/ui/card'
import { cn } from '@rotra/ui/cn'
import { ProgressBar } from '@rotra/ui/progress-bar'

export type CompareIdentity = { name: string; label?: string; pictureUrl?: string | null }
export type CompareStatRow = {
  label: string
  mine: string | number
  theirs: string | number
  /** Better value, supplied by the data layer; no ranking calculation happens here. */
  lead?: 'mine' | 'theirs'
}
export type CompareStatsProps = {
  me: CompareIdentity
  them: CompareIdentity
  filter: 'all' | 'h2h'
  rows: CompareStatRow[]
  games: number
  myWins: number
  otherWins: number
  className?: string
}

/** Side-by-side presentation of the selected results. Rows and highlights are prepared upstream. */
export function CompareStats({
  me,
  them,
  filter,
  rows,
  games,
  myWins,
  otherWins,
  className,
}: CompareStatsProps) {
  const firstName = them.label ?? them.name.split(/\s+/)[0] ?? them.name
  const rightLabel = filter === 'h2h' ? `${firstName} won` : 'You lost'
  const rightCount = filter === 'h2h' ? otherWins : games - myWins
  return (
    <Card asChild className={cn('flex flex-col gap-3', className)}>
      <section aria-label="Side by side">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="flex min-w-0 flex-col items-center gap-1 text-center">
            <Avatar name={me.name} src={me.pictureUrl ?? undefined} size={64} />
            <b>You</b>
          </div>
          <span
            aria-hidden
            className="grid size-8 place-items-center rounded-full bg-elev text-fg2"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 5l6 7-6 7M19 5l-6 7 6 7" />
            </svg>
          </span>
          <div className="flex min-w-0 flex-col items-center gap-1 text-center">
            <Avatar name={them.name} src={them.pictureUrl ?? undefined} size={64} />
            <b className="[overflow-wrap:anywhere]">{firstName}</b>
          </div>
        </div>
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[1fr_auto_1fr] items-center gap-2.5 border-t border-border py-2.5 text-center"
          >
            <b
              className={cn(
                'min-w-0 text-[15px] [overflow-wrap:anywhere]',
                row.lead === 'mine' && 'text-accent',
              )}
            >
              {row.mine}
            </b>
            <span className="max-w-[110px] text-[13px] text-fg2">{row.label}</span>
            <b
              className={cn(
                'min-w-0 text-[15px] [overflow-wrap:anywhere]',
                row.lead === 'theirs' && 'text-accent',
              )}
            >
              {row.theirs}
            </b>
          </div>
        ))}
        {games > 0 ? (
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
            <div className="flex min-w-14 flex-col items-center">
              <b className="text-[28px] leading-none tabular-nums">{myWins}</b>
              <span className="text-[13px] text-fg2">You won</span>
            </div>
            <ProgressBar
              value={myWins}
              max={games}
              aria-label={`You won ${myWins} of ${games} games, ${rightLabel} ${rightCount}`}
              className="h-3 rounded-full bg-border-strong [&>i]:rounded-l-full [&>i]:rounded-r-none [&>i]:border-r-2 [&>i]:border-surface"
            />
            <div className="flex min-w-14 flex-col items-center">
              <b className="text-[28px] leading-none tabular-nums">{rightCount}</b>
              <span className="text-[13px] text-fg2">{rightLabel}</span>
            </div>
          </div>
        ) : (
          <p className="text-fg2">
            {filter === 'h2h'
              ? `You haven't played against ${firstName} yet.`
              : 'No shared games yet.'}
          </p>
        )}
      </section>
    </Card>
  )
}
