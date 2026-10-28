import { Avatar } from '@rotra/ui/avatar'
import { Chip } from '@rotra/ui/chip'
import { cn } from '@rotra/ui/cn'
import type { CourtPlayer } from '@rotra/ui/court-drawing'
import { Icon } from '@rotra/ui/icon'
import { levelLabel } from '@rotra/ui/level-pill'
import { formatTime } from '@rotra/ui/now-card/helpers'
import { matchRecordCardVariants } from './MatchRecordCard.variants'

export type MatchRecordCardProps = {
  /** Match number in the session: "#N" */
  number: number
  /** "Court 1"; names the card for assistive tech (the column heading shows it visually) */
  courtLabel?: string
  startedAt: number
  endedAt: number
  /** A fun format (1v2, 3v3, 4v4, 5v5): shows the Fun chip */
  fun?: boolean
  teamA: CourtPlayer[]
  teamB: CourtPlayer[]
  /** null for an invalid match */
  winningTeam: 'A' | 'B' | null
  /** Both scores, or null when the result was confirmed by winner only ("no score") */
  score?: { teamA: number; teamB: number } | null
  /** An invalid match: dimmed, dashed, with an Invalid chip in place of the score */
  invalid?: boolean
  /** Substitutions made during the match; partial games are not counted */
  substitutions?: number
  /** The "now" state: the match on court at the replay's current moment */
  highlighted?: boolean
  /** A player's picture opens their profile */
  onSelectPlayer: (playerId: string) => void
  className?: string
}

/**
 * One recorded match in a session record's court column (Q-MATCH-RECORD): "#N", its time range,
 * a Fun chip when relevant, both teams with the winning side highlighted "Won", the score, "no
 * score" or an Invalid chip, and the substitution note. The prototype's historyMatch() (.hm).
 */
export function MatchRecordCard({
  number,
  courtLabel,
  startedAt,
  endedAt,
  fun = false,
  teamA,
  teamB,
  winningTeam,
  score = null,
  invalid = false,
  substitutions = 0,
  highlighted = false,
  onSelectPlayer,
  className,
}: MatchRecordCardProps) {
  const team = (players: CourtPlayer[], won: boolean) => (
    <div
      className={cn(
        'flex flex-wrap items-center gap-1.5 rounded-[6px] p-1',
        won && 'bg-accent-subtle',
      )}
    >
      {players.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onSelectPlayer(p.id)}
          title={`${p.name} · ${levelLabel(p.level)}`}
          aria-label={`${p.name}. View profile`}
          className="group/face -m-0.5 flex min-w-0 flex-col items-center gap-px rounded-lg border-0 bg-transparent p-0.5 touch:p-1"
        >
          <Avatar
            name={p.name}
            src={p.photoUrl}
            size={24}
            className="group-hover/face:shadow-[0_0_0_2px_var(--accent)]"
          />
          <span className="max-w-16 truncate text-[11px]">{p.shortName}</span>
        </button>
      ))}
      {won ? (
        <span className="ml-auto inline-flex items-center gap-0.5 text-[11px] font-bold text-accent">
          <Icon name="check" size={12} />
          Won
        </span>
      ) : null}
    </div>
  )
  return (
    <article
      aria-label={courtLabel ? `Match ${number} on ${courtLabel}` : `Match ${number}`}
      className={cn(
        matchRecordCardVariants({ state: invalid ? 'invalid' : 'completed', highlighted }),
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <span className="font-mono text-[13px]">#{number}</span>
        <span className="text-[13px] text-fg2">
          {formatTime(startedAt)}–{formatTime(endedAt)}
        </span>
        {fun ? <Chip>Fun</Chip> : null}
      </div>
      {team(teamA, !invalid && winningTeam === 'A')}
      <div className="text-center text-[13px]">
        {invalid ? (
          <Chip tone="error">Invalid</Chip>
        ) : score ? (
          <b className="tabular-nums">
            {score.teamA}–{score.teamB}
          </b>
        ) : (
          <span className="text-fg2">no score</span>
        )}
      </div>
      {team(teamB, !invalid && winningTeam === 'B')}
      {substitutions > 0 ? (
        <p className="text-[13px] text-fg2">
          {substitutions} substitution{substitutions > 1 ? 's' : ''}; partial games not counted
        </p>
      ) : null}
    </article>
  )
}
