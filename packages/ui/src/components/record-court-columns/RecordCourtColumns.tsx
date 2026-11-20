import { cn } from '@rotra/ui/cn'
import { MatchCourt, type MatchCourtPlayer } from '@rotra/ui/match-court'
import { type MatchRecordCardProps, substitutionCreditLine } from '@rotra/ui/match-record-card'
import { formatTimeRange } from '@rotra/ui/now-card/helpers'

export type RecordCourtColumn = {
  /** "Court 1" */
  label: string
  /** The court's matches in the order they started */
  matches: (Omit<MatchRecordCardProps, 'onSelectPlayer' | 'courtLabel' | 'className'> & {
    id: string
    /** Best of 3 (Q22): every game, Team A first; `score` then holds the games won */
    games?: { a: number; b: number }[] | null
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
 * with "N matches" and, in play order, each match drawn on the shared MatchCourt (2026-11-15 record
 * courts log; the same court as the finished session page's Match history): "#N · start–end"
 * (· Fun) as the corner pill, Team A on the left, faces with first names on dark pills, the winning
 * pair ringed, the score (or "No score") and "◀ Won" / "Won ▶" on the net, Invalid on a
 * desaturated court; the match on court at the replay moment glows. Substitution lines sit under
 * the court. Or "No matches.". The columns sit side by side on wide screens and stack on phones.
 */
export function RecordCourtColumns({
  columns,
  onSelectPlayer,
  className,
}: RecordCourtColumnsProps) {
  const face = (p: RecordCourtColumn['matches'][number]['teamA'][number]): MatchCourtPlayer => ({
    key: p.id,
    name: p.name,
    label: p.shortName,
    pictureUrl: p.photoUrl ?? null,
    onOpen: () => onSelectPlayer(p.id),
  })
  const names = (players: RecordCourtColumn['matches'][number]['teamA']) =>
    players.map((p) => p.name).join(' and ')
  return (
    <div
      className={cn(
        'grid gap-3 grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))]',
        className,
      )}
    >
      {columns.map((column) => (
        <section
          key={column.label}
          aria-label={column.label}
          className="flex min-w-0 flex-col gap-2 rounded-lg border border-border bg-surface p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="[overflow-wrap:anywhere]">{column.label}</h3>
            <span className="text-[13px] text-fg2">
              {column.matches.length} match{column.matches.length === 1 ? '' : 'es'}
            </span>
          </div>
          {column.matches.length ? (
            column.matches.map((m) => {
              const invalid = m.invalid ?? false
              const credits = m.substitutionCredits ?? []
              const substitutions = m.substitutions ?? 0
              return (
                <div key={m.id} className="flex flex-col gap-1.5">
                  <MatchCourt
                    number={m.number}
                    timeLabel={
                      m.startedAt !== undefined && m.endedAt !== undefined
                        ? formatTimeRange(m.startedAt, m.endedAt)
                        : ''
                    }
                    ariaLabel={`Match ${m.number} on ${column.label}: ${names(m.teamA)} versus ${names(m.teamB)}`}
                    fun={m.fun}
                    left={m.teamA.map(face)}
                    right={m.teamB.map(face)}
                    winner={
                      invalid || !m.winningTeam ? null : m.winningTeam === 'A' ? 'left' : 'right'
                    }
                    score={m.score ? `${m.score.teamA}–${m.score.teamB}` : null}
                    gameScores={m.games?.map((g) => `${g.a}–${g.b}`)}
                    invalid={invalid}
                    now={m.highlighted}
                  />
                  {substitutions > 0 ? (
                    <p className="m-0 text-[13px] text-fg2">
                      {substitutions} substitution{substitutions > 1 ? 's' : ''}; partial games not
                      counted
                    </p>
                  ) : null}
                  {credits.map((s, index) => (
                    <p
                      key={`${s.outName}-${s.inName}-${index}`}
                      className="m-0 text-[13px] text-fg2"
                    >
                      {substitutionCreditLine(s, invalid)}
                    </p>
                  ))}
                </div>
              )
            })
          ) : (
            <p className="m-0 text-[13px] text-fg2">No matches.</p>
          )}
        </section>
      ))}
    </div>
  )
}
