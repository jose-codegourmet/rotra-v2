import { cn } from '@rotra/ui/cn'
import { MatchRecordCard, type MatchRecordCardProps } from '@rotra/ui/match-record-card'

export type RecordCourtColumn = {
  /** "Court 1" */
  label: string
  /** The court's matches in the order they started */
  matches: (Omit<MatchRecordCardProps, 'onSelectPlayer' | 'courtLabel' | 'className'> & {
    id: string
  })[]
}

export type RecordCourtColumnsProps = {
  columns: RecordCourtColumn[]
  /** A player's picture opens their profile */
  onSelectPlayer: (playerId: string) => void
  className?: string
}

/**
 * Every match of a session record by court (the prototype's .hist-courts): one column per court
 * with "N matches" and its MatchRecordCards in play order, or "No matches.". The columns sit side
 * by side on wide screens and stack on phones.
 */
export function RecordCourtColumns({ columns, onSelectPlayer, className }: RecordCourtColumnsProps) {
  return (
    <div
      className={cn(
        'grid gap-3 grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))]',
        className,
      )}
    >
      {columns.map((column) => (
        <section key={column.label} aria-label={column.label} className="flex min-w-0 flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="[overflow-wrap:anywhere]">{column.label}</h3>
            <span className="text-[13px] text-fg2">
              {column.matches.length} match{column.matches.length === 1 ? '' : 'es'}
            </span>
          </div>
          {column.matches.length ? (
            column.matches.map(({ id, ...match }) => (
              <MatchRecordCard
                key={id}
                {...match}
                courtLabel={column.label}
                onSelectPlayer={onSelectPlayer}
              />
            ))
          ) : (
            <p className="m-0 text-[13px] text-fg2">No matches.</p>
          )}
        </section>
      ))}
    </div>
  )
}
