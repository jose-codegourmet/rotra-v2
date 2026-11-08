'use client'
import type { PlayerSessionRecord } from '@rotra/data/player/types'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { ErrorState } from '@rotra/ui/error-state'
import { Field } from '@rotra/ui/field'
import { PageHeader } from '@rotra/ui/page-header'
import { PlayerPagination } from '@rotra/ui/player-pagination'
import { SegmentedControl } from '@rotra/ui/segmented-control'
import { Select } from '@rotra/ui/select'
import { SessionGames } from '@rotra/ui/session-games'
import { Skeleton } from '@rotra/ui/skeleton'
import { TextInput } from '@rotra/ui/text-input'
export type AdminPlayerHistoryProps = {
  /** Compact session summaries for the Quick view; defaults to the full history page. */
  variant?: 'default' | 'compact'
  limit?: number
  linkComponent?: import('react').ElementType
  name: string
  backHref: string
  sessions?: PlayerSessionRecord[]
  error?: boolean
  notFound?: boolean
  onRetry: () => void
  tab: string
  club: string
  from: string
  to: string
  page: number
  onChange: (patch: Record<string, string>) => void
}
export function AdminPlayerHistory({
  variant = 'default',
  limit = 2,
  linkComponent: Link = 'a',
  name,
  backHref,
  sessions,
  error,
  notFound,
  onRetry,
  tab,
  club,
  from,
  to,
  page,
  onChange,
}: AdminPlayerHistoryProps) {
  if (variant === 'compact') {
    const recent = sessions
      ?.slice()
      .sort((a, b) => Date.parse(b.finishedAt) - Date.parse(a.finishedAt))
      .slice(0, limit)
    return (
      <section className="flex flex-col gap-1.5 border-t border-border pt-2.5" aria-label="History">
        <h3 className="text-xs font-bold uppercase tracking-[0.06em] text-fg2">History</h3>
        {error ? (
          <ErrorState title="Couldn't load games." onRetry={onRetry} />
        ) : !recent ? (
          <Skeleton label="Loading history" />
        ) : recent.length ? (
          <div>
            {recent.map((session) => {
              const wins = session.games.filter((game) => game.result === 'won').length
              const losses = session.games.filter((game) => game.result === 'lost').length
              return (
                <div
                  key={session.id}
                  className="flex items-baseline justify-between gap-2.5 border-t border-border py-2 first:border-t-0"
                >
                  <div className="min-w-0 [overflow-wrap:anywhere]">
                    <b>{session.title}</b>
                    <span className="text-sm text-fg2">
                      {' '}
                      · {session.clubName} ·{' '}
                      {new Intl.DateTimeFormat('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        timeZone: 'Asia/Manila',
                      }).format(new Date(session.finishedAt))}
                    </span>
                  </div>
                  <span
                    className="shrink-0 tabular-nums"
                    role="img"
                    aria-label={`${wins} wins, ${losses} losses`}
                  >
                    {wins}–{losses}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-fg2">No games yet</p>
        )}
      </section>
    )
  }
  const date = (at: string) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(at))
  const filtered = (sessions ?? []).filter(
    (s) =>
      (!club || s.clubName === club) &&
      (!from || date(s.finishedAt) >= from) &&
      (!to || date(s.finishedAt) <= to),
  )
  const games = filtered.flatMap((s) => s.games),
    counted = games.filter((g) => g.counting === 'counted').length
  const blocks = filtered
    .map((s) => ({
      ...s,
      games: s.games.filter(
        (g) => tab === 'all' || (g.counting === 'counted') === (tab === 'counted'),
      ),
    }))
    .filter((s) => s.games.length)
  const pageCount = Math.max(1, Math.ceil(blocks.length / 10)),
    current = Math.min(pageCount, Math.max(1, page))
  return (
    <>
      <Button asChild variant="ghost">
        <Link href={backHref}>← {name}</Link>
      </Button>
      <PageHeader
        title="Games"
        description="Read-only. Admin can't change ranks, winners or scores."
      />
      {notFound ? (
        <p>Player not found.</p>
      ) : error ? (
        <ErrorState title="Couldn't load games." onRetry={onRetry} />
      ) : !sessions ? (
        <Skeleton label="Loading games" />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Select
              aria-label="Club"
              value={club || 'all'}
              options={[
                { value: 'all', label: 'All clubs' },
                ...[...new Set(sessions.map((s) => s.clubName))].map((c) => ({
                  value: c,
                  label: c,
                })),
              ]}
              onChange={(c) => onChange({ club: c === 'all' ? '' : c, page: '1' })}
            />
            <Field label="From">
              <TextInput
                type="date"
                value={from}
                onChange={(e) => onChange({ since: e.target.value, page: '1' })}
              />
            </Field>
            <Field label="To">
              <TextInput
                type="date"
                min={from}
                value={to}
                onChange={(e) => onChange({ until: e.target.value, page: '1' })}
              />
            </Field>
          </div>
          <SegmentedControl
            aria-label="Game type"
            value={tab}
            options={[
              { value: 'counted', label: 'Counted', count: counted },
              { value: 'other', label: 'Fun and partial', count: games.length - counted },
              { value: 'all', label: 'All', count: games.length },
            ]}
            onChange={(tab) => onChange({ tab, page: '1' })}
          />
          <Card className="flex flex-col gap-5">
            {blocks.length ? (
              blocks
                .slice((current - 1) * 10, current * 10)
                .map((s) => <SessionGames key={s.id} session={s} />)
            ) : (
              <p>No games yet</p>
            )}
          </Card>
          <PlayerPagination
            page={current}
            pageCount={pageCount}
            pageSize={10}
            total={blocks.length}
            onPage={(page) => onChange({ page: String(page) })}
          />
        </>
      )}
    </>
  )
}
