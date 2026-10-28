import { Card } from '@rotra/ui/card'
import { Chip } from '@rotra/ui/chip'
import { cn } from '@rotra/ui/cn'
import { CourtDrawing, type CourtPlayer } from '@rotra/ui/court-drawing'
import { Icon } from '@rotra/ui/icon'
import { IconButton } from '@rotra/ui/icon-button'
import { formatTime } from '@rotra/ui/now-card/helpers'
import type { ChangeEvent } from 'react'

/** The match on a court at the replay's current moment */
export type ReplayCourtMatch = {
  number: number
  /** Whole minutes since the match started, at the current moment */
  minutesIn: number
  teamA: CourtPlayer[]
  teamB: CourtPlayer[]
}

export type ReplayCourt = {
  /** "Court 1" */
  label: string
  /** null when the court was free at this moment */
  match: ReplayCourtMatch | null
}

export type ReplayCardProps = {
  /** Every court as it looked at `value` */
  courts: ReplayCourt[]
  /** First match start, in ms */
  from: number
  /** Last match end, in ms */
  to: number
  /** The current moment, in ms; the container advances it while playing */
  value: number
  playing: boolean
  /** The slider moved; the value is a time in ms on a one-minute step */
  onSeek: (value: number) => void
  onTogglePlay: () => void
  /** "7:55 PM · 2 games on court · 7 finished so far" */
  summary: string
  /** Tapping a player on a court opens their profile */
  onSelectPlayer: (playerId: string) => void
  className?: string
}

const STEP = 60_000

/**
 * The session record's replay (How the night ran): every court as it looked at one moment, with
 * busy courts drawn with their players and "#N · M min", free courts greyed; under them the
 * play/pause button, the time, the timeline slider and the end time, then a summary line. The
 * prototype's replayCard() (.replay, .rp-*). It does not run the timer: the container owns `value`.
 */
export function ReplayCard({
  courts,
  from,
  to,
  value,
  playing,
  onSeek,
  onTogglePlay,
  summary,
  onSelectPlayer,
  className,
}: ReplayCardProps) {
  const onChange = (event: ChangeEvent<HTMLInputElement>) => onSeek(Number(event.target.value))
  return (
    <Card className={cn('flex flex-col gap-3.5', className)}>
      <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr))]">
        {courts.map((court) => (
          <div
            key={court.label}
            className={cn(
              'flex min-w-0 flex-col gap-1.5 rounded-md border border-border-strong bg-bg p-2.5 transition-colors motion-reduce:transition-none',
              court.match && 'border-accent',
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <b>{court.label}</b>
              {court.match ? (
                <Chip tone="accent">
                  #{court.match.number} · {court.match.minutesIn} min
                </Chip>
              ) : (
                <Chip>Free</Chip>
              )}
            </div>
            {court.match ? (
              <CourtDrawing
                teamA={court.match.teamA}
                teamB={court.match.teamB}
                onOpenProfile={onSelectPlayer}
              />
            ) : (
              <CourtDrawing free />
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2.5">
        <IconButton
          size="sm"
          variant="primary"
          label={playing ? 'Pause replay' : 'Play replay'}
          onClick={onTogglePlay}
        >
          <Icon name={playing ? 'pause' : 'play'} />
        </IconButton>
        <span aria-hidden className="text-[13px] tabular-nums">
          {formatTime(value)}
        </span>
        <input
          type="range"
          min={from}
          max={to}
          step={STEP}
          value={value}
          onChange={onChange}
          aria-label="Replay time"
          aria-valuetext={formatTime(value)}
          className="h-7 min-w-0 flex-1 cursor-pointer accent-accent"
        />
        <span className="text-[13px] text-fg2 tabular-nums">{formatTime(to)}</span>
      </div>
      <p className="text-[13px] text-fg2">{summary}</p>
    </Card>
  )
}
