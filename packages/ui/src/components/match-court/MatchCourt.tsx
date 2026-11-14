import { Avatar } from '@rotra/ui/avatar'
import { Chip } from '@rotra/ui/chip'
import { cn } from '@rotra/ui/cn'
import type { ReactNode } from 'react'

/** One face on the court: the masked or full name for the accessible name, the pill's first name. */
export type MatchCourtPlayer = {
  /** Stable within the match */
  key: string
  /** Per the page's name rule; the face's accessible name */
  name: string
  /** The pill under the face: first name, or “You” for the viewer */
  label: string
  pictureUrl?: string | null
  /** Opens the profile card; without it the face is not a button */
  onOpen?: () => void
}

export type MatchCourtProps = {
  /** “#N”; with `timeLabel` it makes the corner pill “#N · time” (Queue variant) */
  number?: number
  /** “7:10–7:30 PM” */
  timeLabel?: string
  /** Player variant: the whole corner pill text instead of “#N · time”, drawn small caps (“Doubles”) */
  cornerLabel?: string
  /** Accessible name of the court; defaults to “Match N: A versus B” */
  ariaLabel?: string
  /** Top-right slot on the court, e.g. the round Share button of your own game */
  action?: ReactNode
  /** Player variant: counted games only ring the winners; “Not counted” replaces Won / Lost */
  notCounted?: boolean
  /** Player variant: warn line under the court, “NOTE · not counted” */
  note?: string
  /** Muted line under the court (Recent games: “session · date · club”) */
  dateLine?: string
  /** A fun format: “· Fun” in the corner pill */
  fun?: boolean
  /** The viewer's pair when it is their match, else Team A */
  left: MatchCourtPlayer[]
  right: MatchCourtPlayer[]
  /** The winning side, ringed in the accent; null for no winner (an invalid match) */
  winner: 'left' | 'right' | null
  /** The score read from the left side, “21–17”; null shows “No score” */
  score: string | null
  /** Invalid: desaturated court, Invalid chip, no score */
  invalid?: boolean
  /** The viewer's own match: Won / Lost; otherwise “◀ Won” or “Won ▶” */
  mine?: boolean
  /** On court at the replay's moment: accent glow */
  now?: boolean
  className?: string
}

/** The Queue app's court art (viewBox 134 × 61): solid court green, white lines, the dashed net. */
export function MatchCourtArt() {
  return (
    <svg
      viewBox="0 0 134 61"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="absolute inset-0 block size-full"
    >
      <rect width={134} height={61} fill="var(--color-court)" />
      <g
        fill="none"
        stroke="var(--color-court-line)"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      >
        <rect x={0.75} y={0.75} width={132.5} height={59.5} vectorEffect="non-scaling-stroke" />
        <path
          d="M0 4.6H134M0 56.4H134M7.6 0V61M126.4 0V61M47.2 0V61M86.8 0V61M0 30.5H47.2M86.8 30.5H134"
          vectorEffect="non-scaling-stroke"
        />
      </g>
      <path
        d="M67 0V61"
        stroke="var(--color-court-line)"
        strokeWidth={3}
        strokeDasharray="4 3"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

/**
 * One match of a finished session's Match history drawn as a small court (2026-11-13 match history
 * courts log; the prototype's pubHistoryMatch, `.gm*`), the same design as ROTRA Player's game rows:
 * “#N · start–end (· Fun)” as a corner pill, faces with first names on dark pills (winners ringed
 * in the accent), and a dark box on the net with the score (or “No score”) and the result. The
 * viewer's own match puts their pair on the left with Won / Lost; another match shows “◀ Won” or
 * “Won ▶”; an invalid match shows Invalid on a desaturated court.
 */
export function MatchCourt({
  number,
  timeLabel,
  cornerLabel,
  ariaLabel,
  action,
  notCounted = false,
  note,
  dateLine,
  fun,
  left,
  right,
  winner,
  score,
  invalid = false,
  mine = false,
  now = false,
  className,
}: MatchCourtProps) {
  const face = (player: MatchCourtPlayer, won: boolean) => {
    const body = (
      <>
        <Avatar
          name={player.name}
          src={player.pictureUrl ?? undefined}
          size={44}
          className={cn(
            'size-[46px] text-sm max-[480px]:size-9 max-[480px]:text-xs',
            won ? 'ring-3 ring-accent' : 'ring-2 ring-court-line',
            player.onOpen &&
              'group-hover/face:ring-3 group-hover/face:ring-accent group-focus-visible/face:ring-3 group-focus-visible/face:ring-accent',
          )}
        />
        <b className="max-w-full truncate rounded-full bg-court-level-label px-[7px] text-xs leading-[1.3] font-bold text-on-photo">
          {player.label}
        </b>
      </>
    )
    const base =
      'group/face flex min-w-0 max-w-[84px] flex-col items-center gap-[3px] rounded-lg border-0 bg-transparent p-0.5 text-on-photo max-[480px]:max-w-14'
    return player.onOpen ? (
      <button
        key={player.key}
        type="button"
        aria-label={`${player.name}. View profile`}
        onClick={player.onOpen}
        className={cn(base, 'cursor-pointer focus-visible:outline-none')}
      >
        {body}
      </button>
    ) : (
      <span key={player.key} className={base}>
        {body}
      </span>
    )
  }
  const side = 'relative z-1 flex min-w-0 items-center justify-evenly gap-1.5 px-1 py-3'
  const names = (players: MatchCourtPlayer[]) => players.map((p) => p.name).join(' and ')
  const leftWon = winner === 'left'
  const ring = !invalid && !notCounted
  const playerVariant = cornerLabel !== undefined
  return (
    <article
      data-now={now || undefined}
      className={cn('flex flex-col', invalid && '[&_[data-court]]:saturate-[.4]', className)}
    >
      <fieldset
        data-court
        aria-label={ariaLabel ?? `Match ${number}: ${names(left)} versus ${names(right)}`}
        className={cn(
          'relative m-0 grid min-h-[132px] min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center overflow-hidden rounded-lg border-0 p-0 transition-shadow motion-reduce:transition-none',
          playerVariant ? 'pt-2.5 max-[480px]:min-h-[100px]' : 'pt-3 max-[480px]:min-h-[112px]',
          now &&
            'shadow-[0_0_0_3px_var(--accent),0_0_18px_2px_color-mix(in_srgb,var(--accent)_35%,transparent)]',
        )}
      >
        <MatchCourtArt />
        {playerVariant ? (
          <span className="absolute top-2 left-2 z-2 rounded-full bg-court-level-label px-2 text-[10px] font-extrabold tracking-[0.5px] whitespace-nowrap text-on-photo/85 uppercase">
            {cornerLabel}
          </span>
        ) : (
          <span className="absolute top-2 left-2 z-2 rounded-full bg-court-level-label px-2 text-[11px] font-bold whitespace-nowrap text-on-photo/90 max-[480px]:text-[10px]">
            #{number} · {timeLabel}
            {fun ? ' · Fun' : ''}
          </span>
        )}
        {action}
        <div className={side}>{left.map((p) => face(p, ring && leftWon))}</div>
        <div className="relative z-1 mx-1 flex min-w-24 flex-col items-center justify-center gap-1.5 rounded-xl bg-court-level-label px-3.5 py-2.5 text-center text-on-photo max-[480px]:mx-0.5 max-[480px]:min-w-0 max-[480px]:px-2 max-[480px]:py-2">
          {invalid ? null : score ? (
            <span className="font-mono text-[22px] leading-none font-bold whitespace-nowrap tabular-nums max-[480px]:text-[17px]">
              <span className="sr-only">Score </span>
              {score}
            </span>
          ) : (
            <span
              title="Winner recorded; score not entered"
              className="text-[13px] font-semibold whitespace-nowrap text-on-photo/80 max-[480px]:text-[11px]"
            >
              No score
            </span>
          )}
          {invalid ? (
            <Chip tone="error">Invalid</Chip>
          ) : notCounted ? (
            <Chip>Not counted</Chip>
          ) : winner && mine ? (
            <Chip tone={leftWon ? 'accent' : 'error'}>{leftWon ? 'Won' : 'Lost'}</Chip>
          ) : winner ? (
            <span className="text-xs font-extrabold whitespace-nowrap text-accent">
              {leftWon ? '◀ Won' : 'Won ▶'}
            </span>
          ) : null}
        </div>
        <div className={side}>{right.map((p) => face(p, ring && winner === 'right'))}</div>
      </fieldset>
      {note ? <div className="text-[13px] text-warn">{note} · not counted</div> : null}
      {dateLine ? <p className="text-[13px] text-fg2">{dateLine}</p> : null}
    </article>
  )
}
