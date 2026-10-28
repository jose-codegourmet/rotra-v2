import { Card } from '@rotra/ui/card'
import { Chip } from '@rotra/ui/chip'
import { cn } from '@rotra/ui/cn'
import { sessionRecordHeaderVariants } from './SessionRecordHeader.variants'

export type SessionRecordTotals = {
  /** Counted games; null on an invalid session (shown as "—") */
  games: number | null
  /** Games marked invalid; shown as "N invalid" under Games on a valid session */
  invalidGames: number
  players: number
  courts: number
  /** Already formatted, e.g. "3 h" or "2 h 30 min" */
  length: string
}

export type SessionRecordHeaderProps = {
  title: string
  /** "Thu, Oct 23 · 7:00 PM–10:00 PM" (date · start–end), already formatted */
  when: string
  venue: string
  state: 'completed' | 'invalid'
  /** Results published to the public page; ignored when the session is invalid */
  published?: boolean
  totals: SessionRecordTotals
  className?: string
}

const LABEL = 'text-xs font-semibold tracking-[0.5px] text-fg2 uppercase'

/**
 * Header of the read-only session record (Q-HISTORY, Q-INVALID-SESSION): "Session record · read-only",
 * the title, date · time · venue, the state chips and the four totals tiles.
 */
export function SessionRecordHeader({
  title,
  when,
  venue,
  state,
  published = false,
  totals,
  className,
}: SessionRecordHeaderProps) {
  const invalid = state === 'invalid'
  const tiles: { key: string; label: string; value: string; sub?: string }[] = [
    {
      key: 'games',
      label: 'Games',
      value: invalid || totals.games == null ? '—' : String(totals.games),
      sub: !invalid && totals.invalidGames > 0 ? `${totals.invalidGames} invalid` : undefined,
    },
    { key: 'players', label: 'Players', value: String(totals.players) },
    { key: 'courts', label: 'Courts', value: String(totals.courts) },
    { key: 'length', label: 'Length', value: totals.length },
  ]
  return (
    <header data-state={state} className={cn(sessionRecordHeaderVariants({ state }), className)}>
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className={LABEL}>Session record · read-only</span>
        <h1 className="[overflow-wrap:anywhere]">{title}</h1>
        <p className="m-0 text-[13px] text-fg2 [overflow-wrap:anywhere]">
          {when} · {venue}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {invalid ? (
          <Chip tone="error">Invalid session</Chip>
        ) : (
          <>
            <Chip tone="accent">Completed</Chip>
            {published ? (
              <Chip tone="accent">Results published</Chip>
            ) : (
              <Chip tone="neutral">Results private</Chip>
            )}
          </>
        )}
      </div>
      <dl
        aria-label="Session totals"
        className="m-0 grid grid-cols-[repeat(auto-fit,minmax(min(100%,140px),1fr))] gap-3"
      >
        {tiles.map((tile) => (
          <Card key={tile.key} data-tile={tile.key} className="flex flex-col gap-0.5">
            <dt className={LABEL}>{tile.label}</dt>
            <dd className="m-0 flex flex-col gap-0.5">
              <b className="text-[26px] font-extrabold tabular-nums">{tile.value}</b>
              {tile.sub ? <span className="text-[13px] text-fg2">{tile.sub}</span> : null}
            </dd>
          </Card>
        ))}
      </dl>
    </header>
  )
}
