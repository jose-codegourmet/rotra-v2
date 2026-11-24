'use client'

import type { PlayingLevel } from '@rotra/data/player/types'
import { queueTime } from '@rotra/schema/queue-time'
import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { Chip } from '@rotra/ui/chip'
import { cn } from '@rotra/ui/cn'
import { CountPills } from '@rotra/ui/count-pills'
import type { CourtPlayer } from '@rotra/ui/court-drawing'
import { levelLabel, levelRingClass } from '@rotra/ui/level-pill'
import { MatchCourt, type MatchCourtPlayer } from '@rotra/ui/match-court'
import { substitutionCreditLine } from '@rotra/ui/match-record-card'
import { Notice } from '@rotra/ui/notice'
import { formatTime, formatTimeRange } from '@rotra/ui/now-card/helpers'
import { Sheet } from '@rotra/ui/sheet'
import { useState } from 'react'

/** The two pills (the Match History pill filter) */
export type SessionGamesTab = 'matches' | 'queue'

/** Whose games these are: the header's picture, full name and level */
export type SessionGamesPlayer = {
  id: string
  /** Full name: the header line and the face's accessible name */
  name: string
  /** Nickname or first name: “NAME's games”, “NAME has no finished matches yet…” */
  shortName: string
  level: PlayingLevel | null
  photoUrl?: string
}

/** How a finished match counts for this player */
export type SessionGamesCounting = 'counts' | 'not-counted' | 'invalid'

/** One finished match the player was in (done or invalid), as the Match History court */
export type SessionGamesMatch = {
  id: string
  /** “#N” */
  number: number
  /** “Court 2”, or “Court 1 + Court 2” for a 5v5 */
  courtLabel: string
  startedAt: number
  endedAt: number
  /** Counts (default), Not counted (a substitution gave the game to the other player), Invalid · not counted */
  counting: SessionGamesCounting
  /** A fun format: “· Fun” in the corner pill */
  fun?: boolean
  teamA: CourtPlayer[]
  teamB: CourtPlayer[]
  /** null for an invalid match */
  winningTeam: 'A' | 'B' | null
  /** null when the result was confirmed by winner only: “No score” */
  score?: { teamA: number; teamB: number } | null
  /** Best of 3: every game, Team A first */
  games?: { a: number; b: number }[] | null
  /** One line under the court per substitution */
  substitutionCredits?: {
    outName: string
    inName: string
    creditTo?: 'nobody' | 'incoming' | 'outgoing'
  }[]
}

/** One waiting Main Queue match the player is in */
export type SessionGamesPlannedMatch = {
  id: string
  /** 1-based place in the Main Queue: “#N in the Main Queue” */
  position: number
  /** Matches ahead of it in the Main Queue; 0 reads “next up” */
  matchesAhead: number
  /** “Doubles”, “3v3 fun”: the corner pill reads “#N · format” */
  formatLabel: string
  teamA: CourtPlayer[]
  teamB: CourtPlayer[]
}

/** The player is on a court right now */
export type SessionGamesOnCourt = {
  status: 'playing' | 'getting-ready'
  /** “Court 2” */
  courtLabel: string
  /** “Match 18” */
  matchNumber: number
}

export type SessionGamesDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  player: SessionGamesPlayer
  /** Finished matches the player was in, any order; shown latest first */
  matches: SessionGamesMatch[]
  /** The player's waiting Main Queue matches; shown in the order given (nearest first) */
  planned: SessionGamesPlannedMatch[]
  /** Games played this session (the badge number), by hand included */
  gamesPlayed: number
  /** Set games played adjustment: “includes +2 set by hand”; omit or 0 for none */
  setByHand?: number
  /** Playing or Getting ready now: the notice under the pills */
  onCourt?: SessionGamesOnCourt | null
  /**
   * The picked pill. Controlled when `onTabChange` is given (the caller keeps it so “Back to games” from
   * a profile reopens the same pill); otherwise the dialog keeps it, starting on Matches.
   */
  tab?: SessionGamesTab
  onTabChange?: (tab: SessionGamesTab) => void
  /**
   * A face opens that player's profile. The caller closes this dialog (`open` false) and, on its
   * Back button “Back to games”, sets `open` true again; the player and tab are the caller's to keep.
   */
  onOpenProfile: (playerId: string) => void
  className?: string
}

const MINUTE = 60_000

const COUNTING_CHIP: Record<
  SessionGamesCounting,
  { tone: 'accent' | 'warn' | 'error'; label: string }
> = {
  counts: { tone: 'accent', label: 'Counts' },
  'not-counted': { tone: 'warn', label: 'Not counted' },
  invalid: { tone: 'error', label: 'Invalid · not counted' },
}

const matchesWord = (n: number) => `${n} match${n === 1 ? '' : 'es'}`

/**
 * D-SESSION-GAMES (Q-CONSOLE, Q-COURTS, Q-QUEUE; the prototype's `sessionGames` sheet, sessionGamesBody()
 * and plannedQueueBody(); 2026-11-23 games badge log): a compact “NAME's games” dialog opened from
 * the games badge on a face. A one-line header (picture with the level ring, full name, level), the
 * Matches and Planned queue pills with a count each, then the list; footer Close. Matches: the
 * player's finished matches latest first, each “start time · court · length” with a Counts / Not counted /
 * Invalid · not counted chip over the Match History court with the player's face outlined in warn.
 * Planned queue: the waiting Main Queue matches nearest first, drawn with VS. Presentational: the
 * rows come in as props and a face calls `onOpenProfile`.
 */
export function SessionGamesDialog({
  open,
  onOpenChange,
  player,
  matches,
  planned,
  gamesPlayed,
  setByHand = 0,
  onCourt,
  tab,
  onTabChange,
  onOpenProfile,
  className,
}: SessionGamesDialogProps) {
  const [ownTab, setOwnTab] = useState<SessionGamesTab>('matches')
  const picked = onTabChange ? (tab ?? 'matches') : (tab ?? ownTab)
  const setTab = (value: string) => {
    const next: SessionGamesTab = value === 'queue' ? 'queue' : 'matches'
    if (onTabChange) onTabChange(next)
    else setOwnTab(next)
  }
  const first = player.shortName
  const latestFirst = [...matches].sort((a, b) => b.startedAt - a.startedAt)

  const face = (p: CourtPlayer): MatchCourtPlayer => ({
    key: p.id,
    name: p.name,
    label: p.shortName,
    pictureUrl: p.photoUrl ?? null,
    onOpen: () => onOpenProfile(p.id),
  })
  const names = (players: CourtPlayer[]) => players.map((p) => p.name).join(' and ')

  const playingNotice = onCourt ? (
    <Notice>
      {first} is {onCourt.status === 'getting-ready' ? 'getting ready' : 'playing'} on{' '}
      {onCourt.courtLabel} now (Match {onCourt.matchNumber}).
      {picked === 'matches' ? ' It counts after Match done.' : ''}
    </Notice>
  ) : null

  const finished = (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-[13px] text-fg2">
        {gamesPlayed} game{gamesPlayed === 1 ? '' : 's'} played
        {setByHand ? ` · includes ${setByHand > 0 ? '+' : ''}${setByHand} set by hand` : ''}
        {planned.length ? ` · ${planned.length} waiting in the Main Queue` : ''}. Latest first.
      </p>
      {playingNotice}
      {latestFirst.length ? (
        <ol className="m-0 flex list-none flex-col gap-3.5 p-0">
          {latestFirst.map((m) => {
            const invalid = m.counting === 'invalid'
            const chip = COUNTING_CHIP[m.counting]
            const length = queueTime(
              Math.max(0, Math.round((m.endedAt - m.startedAt) / MINUTE)),
            )
            return (
              <li key={m.id} className="flex flex-col gap-1.5">
                <div className="flex items-baseline gap-1.5 border-b-2 border-accent pb-1.5">
                  <b className="text-sm tabular-nums">{formatTime(m.startedAt)}</b>
                  <span className="text-[13px] text-fg2">
                    · {m.courtLabel} · {length}
                  </span>
                  <Chip tone={chip.tone} className="ml-auto">
                    {chip.label}
                  </Chip>
                </div>
                <MatchCourt
                  number={m.number}
                  timeLabel={formatTimeRange(m.startedAt, m.endedAt)}
                  ariaLabel={`Match ${m.number}: ${names(m.teamA)} versus ${names(m.teamB)}`}
                  fun={m.fun}
                  left={m.teamA.map(face)}
                  right={m.teamB.map(face)}
                  winner={
                    invalid || !m.winningTeam ? null : m.winningTeam === 'A' ? 'left' : 'right'
                  }
                  score={m.score ? `${m.score.teamA}–${m.score.teamB}` : null}
                  gameScores={m.games?.map((g) => `${g.a}–${g.b}`)}
                  invalid={invalid}
                  highlightedPlayerKey={player.id}
                />
                {(m.substitutionCredits ?? []).map((s, i) => (
                  <p key={`${s.outName}-${s.inName}-${i}`} className="m-0 text-[13px] text-fg2">
                    {substitutionCreditLine(s, invalid)}
                  </p>
                ))}
              </li>
            )
          })}
        </ol>
      ) : (
        <div className="rounded-lg border border-border bg-surface p-6 text-center text-fg2">
          {first} has no finished matches yet this session.
        </div>
      )}
    </div>
  )

  const waiting = (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-[13px] text-fg2">
        {first}'s waiting matches in the Main Queue, nearest first. The order can still change.
      </p>
      {playingNotice}
      {planned.length ? (
        <ol className="m-0 flex list-none flex-col gap-3.5 p-0">
          {planned.map((m, index) => (
            <li key={m.id} className="flex flex-col gap-1.5">
              <div className="flex items-baseline gap-1.5 border-b-2 border-accent pb-1.5">
                <b className="text-sm tabular-nums">#{m.position} in the Main Queue</b>
                <span className="text-[13px] text-fg2">
                  · {m.matchesAhead ? `${matchesWord(m.matchesAhead)} ahead` : 'next up'}
                </span>
                {index === 0 ? (
                  <Chip tone="accent" className="ml-auto">
                    Nearest
                  </Chip>
                ) : null}
              </div>
              <MatchCourt
                number={m.position}
                timeLabel={m.formatLabel}
                ariaLabel={`Planned match #${m.position}: ${names(m.teamA)} versus ${names(m.teamB)}`}
                left={m.teamA.map(face)}
                right={m.teamB.map(face)}
                winner={null}
                score={null}
                versus
                highlightedPlayerKey={player.id}
              />
            </li>
          ))}
        </ol>
      ) : (
        <div className="rounded-lg border border-border bg-surface p-6 text-center text-fg2">
          {first} isn't in the Main Queue right now.
        </div>
      )}
    </div>
  )

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={`${first}'s games`}
      wide
      className={className}
      footer={<Button onClick={() => onOpenChange(false)}>Close</Button>}
    >
      <div className="flex flex-col gap-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar
            name={player.name}
            src={player.photoUrl}
            size={44}
            className={cn(
              'flex-none outline-3 outline-offset-2 outline-(--ring)',
              levelRingClass(player.level),
            )}
          />
          <div className="flex min-w-0 flex-col leading-[1.3]">
            <b className="[overflow-wrap:anywhere]">{player.name}</b>
            <span className="text-[13px] text-fg2">{levelLabel(player.level)}</span>
          </div>
        </div>
        <CountPills
          aria-label="Player"
          value={picked}
          onChange={setTab}
          items={[
            { value: 'matches', label: 'Matches', count: matches.length },
            { value: 'queue', label: 'Planned queue', count: planned.length },
          ]}
        />
        {picked === 'matches' ? finished : waiting}
      </div>
    </Sheet>
  )
}
