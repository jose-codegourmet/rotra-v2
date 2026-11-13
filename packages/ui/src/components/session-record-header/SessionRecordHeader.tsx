import { Card } from '@rotra/ui/card'
import { Chip } from '@rotra/ui/chip'
import { cn } from '@rotra/ui/cn'
import { Notice } from '@rotra/ui/notice'
import { SessionTitleLink } from '@rotra/ui/session-title-link'
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

export type CancelledSessionRecordTotals = {
  joined: number
  /** Slot budget; shown as "of N slots" under Joined */
  slots: number
  waitlist: number
  markedPaid: number
  courts: number
}

type SessionRecordHeaderBase = {
  title: string
  /** The public page (`/sessions/<id>/public-page`): the title becomes a new-tab link (SessionTitleLink) */
  titleHref?: string
  /** "Thu, Oct 23 · 7:00 PM–10:00 PM" (date · start–end), already formatted */
  when: string
  venue: string
  className?: string
}

export type SessionRecordHeaderProps = SessionRecordHeaderBase &
  (
    | {
        state: 'completed'
        /** Results published to the public page */
        published?: boolean
        totals: SessionRecordTotals
      }
    | {
        state: 'invalid'
        published?: boolean
        totals: SessionRecordTotals
      }
    | {
        state: 'cancelled'
        /** Already formatted day+time after "Cancelled ", e.g. "yesterday 9:00 PM" */
        cancelledWhen?: string
        /** Empty or omitted shows "No reason given." */
        cancelReason?: string | null
        totals: CancelledSessionRecordTotals
      }
  )

const LABEL = 'text-xs font-semibold tracking-[0.5px] text-fg2 uppercase'

function paidCopy(n: number): string {
  return n === 1
    ? ' 1 player was marked paid; refunds happen outside ROTRA.'
    : ` ${n} players were marked paid; refunds happen outside ROTRA.`
}

/**
 * Header of the read-only session record (Q-HISTORY, Q-INVALID-SESSION, cancelled form):
 * "Session record · read-only", the title, date · time · venue, the state chips and the totals tiles.
 */
export function SessionRecordHeader(props: SessionRecordHeaderProps) {
  const { title, titleHref, when, venue, state, className } = props
  const invalid = state === 'invalid'
  const cancelled = state === 'cancelled'
  const tiles = cancelled
    ? [
        {
          key: 'joined',
          label: 'Joined',
          value: String(props.totals.joined),
          sub: `of ${props.totals.slots} slots`,
        },
        { key: 'waitlist', label: 'Waitlist', value: String(props.totals.waitlist) },
        { key: 'markedPaid', label: 'Marked paid', value: String(props.totals.markedPaid) },
        { key: 'courts', label: 'Courts', value: String(props.totals.courts) },
      ]
    : [
        {
          key: 'games',
          label: 'Games',
          value: invalid || props.totals.games == null ? '—' : String(props.totals.games),
          sub:
            !invalid && props.totals.invalidGames > 0
              ? `${props.totals.invalidGames} invalid`
              : undefined,
        },
        { key: 'players', label: 'Players', value: String(props.totals.players) },
        { key: 'courts', label: 'Courts', value: String(props.totals.courts) },
        { key: 'length', label: 'Length', value: props.totals.length },
      ]

  return (
    <header data-state={state} className={cn(sessionRecordHeaderVariants({ state }), className)}>
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className={LABEL}>Session record · read-only</span>
        <h1 className="[overflow-wrap:anywhere]">
          {titleHref ? <SessionTitleLink title={title} href={titleHref} /> : title}
        </h1>
        <p className="m-0 text-[13px] text-fg2 [overflow-wrap:anywhere]">
          {when} · {venue}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {cancelled ? (
          <>
            <Chip>Cancelled</Chip>
            {props.cancelledWhen ? (
              <span className="text-[13px] text-fg2">Cancelled {props.cancelledWhen}</span>
            ) : null}
          </>
        ) : invalid ? (
          <Chip tone="error">Invalid session</Chip>
        ) : (
          <>
            <Chip tone="accent">Completed</Chip>
            {props.published ? (
              <Chip tone="accent">Results published</Chip>
            ) : (
              <Chip tone="neutral">Results private</Chip>
            )}
          </>
        )}
      </div>
      {cancelled ? (
        <Notice title={props.cancelReason ? `Reason: ${props.cancelReason}` : 'No reason given.'}>
          This session was cancelled before it started. It has no games, standings or result slides,
          and it doesn't count toward player records or rankings.
          {props.totals.markedPaid > 0 ? paidCopy(props.totals.markedPaid) : null}
        </Notice>
      ) : null}
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
