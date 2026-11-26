import { queueTime } from '@rotra/schema/queue-time'
import { Chip } from '@rotra/ui/chip'
import { cn } from '@rotra/ui/cn'
import { CountPills } from '@rotra/ui/count-pills'
import type { CourtPlayer } from '@rotra/ui/court-drawing'
import { MatchCourt, type MatchCourtPlayer } from '@rotra/ui/match-court'
import { substitutionCreditLine } from '@rotra/ui/match-record-card'
import { formatTime, formatTimeRange } from '@rotra/ui/now-card/helpers'

export type LiveMatchHistoryCourt = {
  id: string
  /** "Court 1" */
  label: string
}

export type LiveMatchHistoryMatch = {
  id: string
  /** "#N" */
  number: number
  /** Every court the match used; a 5v5 lists two and shows under both */
  courtIds: string[]
  startedAt: number
  endedAt: number
  /** A fun format: "· Fun" in the corner pill */
  fun?: boolean
  teamA: CourtPlayer[]
  teamB: CourtPlayer[]
  /** null for an invalid match */
  winningTeam: 'A' | 'B' | null
  /** null when the result was confirmed by winner only: "No score" */
  score?: { teamA: number; teamB: number } | null
  /** Best of 3: every game, Team A first */
  games?: { a: number; b: number }[] | null
  invalid?: boolean
  /** One line under the court per substitution */
  substitutionCredits?: {
    outName: string
    inName: string
    creditTo?: 'nobody' | 'incoming' | 'outgoing'
  }[]
}

export type LiveMatchHistoryProps = {
  courts: LiveMatchHistoryCourt[]
  /** The session's finished matches (done and invalid), in any order */
  matches: LiveMatchHistoryMatch[]
  /** "all" or a court id */
  courtFilter: string
  onCourtFilterChange: (value: string) => void
  /** A face opens the player's profile */
  onOpenPlayer: (playerId: string) => void
  className?: string
}

const MINUTE = 60_000

/** "16 min" under an hour, "2 h" after, like the prototype's queueTime. */
function lengthLabel(startedAt: number, endedAt: number): string {
  const minutes = Math.max(0, Math.round((endedAt - startedAt) / MINUTE))
  return queueTime(minutes)
}

/**
 * The live console's Match History view (Q-CONSOLE; the prototype's liveHistoryPane() and
 * lhTimeline(), 2026-11-19 live match history and match history timeline logs): the session's
 * finished matches with the courts stacked one under another ("Court 1 · 5 matches"). In each
 * court the matches run in one column, the latest on top with a "Latest" chip, earlier ones below;
 * each has its start time and length over an accent rule ("9:07 AM · 16 min"), then the shared
 * MatchCourt card. A match on two courts shows under both. The pill filter ("All courts", then
 * each court, each with its count) shows one section.
 */
export function LiveMatchHistory({
  courts,
  matches,
  courtFilter,
  onCourtFilterChange,
  onOpenPlayer,
  className,
}: LiveMatchHistoryProps) {
  const filter = courts.some((c) => c.id === courtFilter) ? courtFilter : 'all'
  const invalidCount = matches.filter((m) => m.invalid).length
  const shown = filter === 'all' ? courts : courts.filter((c) => c.id === filter)
  const onCourt = (courtId: string) =>
    matches.filter((m) => m.courtIds.includes(courtId)).sort((a, b) => b.startedAt - a.startedAt)
  const sections = shown.map((court) => ({ court, list: onCourt(court.id) }))
  const anyShown = sections.some((s) => s.list.length > 0)

  const face = (p: CourtPlayer): MatchCourtPlayer => ({
    key: p.id,
    name: p.name,
    label: p.shortName,
    pictureUrl: p.photoUrl ?? null,
    onOpen: () => onOpenPlayer(p.id),
  })
  const names = (players: CourtPlayer[]) => players.map((p) => p.name).join(' and ')

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="text-lg font-bold">Match History</h2>
        <p className="m-0 text-[13px] text-fg2">
          Tonight's finished matches, court by court. In each court the latest match is on top and
          earlier ones are below. Start time and length sit on top of each match. Winners are
          highlighted.{invalidCount ? ` ${invalidCount} invalid.` : ''}
        </p>
      </div>
      <CountPills
        aria-label="Court"
        value={filter}
        onChange={onCourtFilterChange}
        items={[
          { value: 'all', label: 'All courts', count: matches.length },
          ...courts.map((c) => ({ value: c.id, label: c.label, count: onCourt(c.id).length })),
        ]}
      />
      {anyShown ? (
        <div className="flex flex-col gap-[18px]">
          {sections.map(({ court, list }) => (
            <section
              key={court.id}
              aria-labelledby={`lh-${court.id}`}
              className="flex min-w-0 flex-col gap-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 id={`lh-${court.id}`} className="m-0 text-[15px] [overflow-wrap:anywhere]">
                  {court.label}
                </h3>
                <span className="text-[13px] text-fg2">
                  {list.length} match{list.length === 1 ? '' : 'es'}
                </span>
              </div>
              {list.length ? (
                <ol className="m-0 flex max-w-[640px] list-none flex-col gap-3.5 p-0">
                  {list.map((m, index) => {
                    const invalid = m.invalid ?? false
                    const credits = m.substitutionCredits ?? []
                    return (
                      <li key={m.id} className="flex flex-col gap-1.5">
                        <div className="flex items-baseline gap-1.5 border-b-2 border-accent pb-1.5">
                          <b className="text-sm tabular-nums">{formatTime(m.startedAt)}</b>
                          <span className="text-[13px] text-fg2">
                            · {lengthLabel(m.startedAt, m.endedAt)}
                          </span>
                          {index === 0 ? (
                            <Chip tone="accent" className="ml-auto">
                              Latest
                            </Chip>
                          ) : null}
                        </div>
                        <MatchCourt
                          number={m.number}
                          timeLabel={formatTimeRange(m.startedAt, m.endedAt)}
                          ariaLabel={`Match ${m.number}: ${names(m.teamA)} versus ${names(m.teamB)}`}
                          fun={m.fun}
                          left={m.teamA.map(face)}
                          right={m.teamB.map(face)}
                          winner={
                            invalid || !m.winningTeam
                              ? null
                              : m.winningTeam === 'A'
                                ? 'left'
                                : 'right'
                          }
                          score={m.score ? `${m.score.teamA}–${m.score.teamB}` : null}
                          gameScores={m.games?.map((g) => `${g.a}–${g.b}`)}
                          invalid={invalid}
                        />
                        {credits.map((s, i) => (
                          <p
                            key={`${s.outName}-${s.inName}-${i}`}
                            className="m-0 text-[13px] text-fg2"
                          >
                            {substitutionCreditLine(s, invalid)}
                          </p>
                        ))}
                      </li>
                    )
                  })}
                </ol>
              ) : (
                <p className="m-0 text-[13px] text-fg2">No finished matches on this court yet.</p>
              )}
            </section>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface p-6 text-center text-fg2">
          {matches.length
            ? 'No finished matches on this court yet.'
            : 'No finished matches yet. They show here after Match done.'}
        </div>
      )}
    </div>
  )
}
