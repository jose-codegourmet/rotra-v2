import type { PlayerSessionRecord } from '@rotra/data/player/types'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { cn } from '@rotra/ui/cn'
import { DateBlock, formatSessionDay } from '@rotra/ui/date-block'
import { Icon } from '@rotra/ui/icon'

/** One session's counted record (wins, losses) and all its matches, fun games included. */
export function sessionRecord(session: Pick<PlayerSessionRecord, 'games'>) {
  const counted = session.games.filter((game) => game.counting === 'counted')
  const wins = counted.filter((game) => game.result === 'won').length
  return { wins, losses: counted.length - wins, matches: session.games.length }
}

/** “2W · 2L”: wins in the accent, losses in the error colour. */
export function SessionRecordText({
  wins,
  losses,
  className,
}: {
  wins: number
  losses: number
  className?: string
}) {
  return (
    <b className={cn('text-sm tabular-nums', className)}>
      <span className="text-accent">{wins}W</span> · <span className="text-error">{losses}L</span>
    </b>
  )
}

/**
 * One session row (the prototype's sessRow, `.crow.mbtn.ls-row`): a 46 px date block, the session
 * title in bold over “Tue, Nov 10 · Club”, the counted record over “N matches”, and a chevron. The
 * whole row is a button that opens the session's matches dialog.
 */
export function SessionRecordRow({
  session,
  onOpen,
}: {
  session: PlayerSessionRecord
  onOpen: () => void
}) {
  const at = Date.parse(session.finishedAt)
  const day = formatSessionDay(at)
  const record = sessionRecord(session)
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${session.title}, ${day}, ${session.clubName}, ${record.wins} won ${record.losses} lost. See the matches`}
      className={cn(
        'flex w-full cursor-pointer items-center gap-3 border-0 bg-transparent px-0 py-2.5 text-left text-fg',
        'border-t border-border first:border-t-0 hover:bg-elev',
        'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent',
      )}
    >
      <DateBlock at={at} className="size-[46px]" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <b className="[overflow-wrap:anywhere]">{session.title}</b>
        <span className="text-[13px] text-fg2">
          {day} · {session.clubName}
        </span>
      </span>
      <span className="flex flex-none flex-col items-end gap-0.5 text-right">
        <SessionRecordText wins={record.wins} losses={record.losses} />
        <span className="text-[13px] text-fg2">
          {record.matches} {record.matches === 1 ? 'match' : 'matches'}
        </span>
      </span>
      <Icon name="forward" size={16} className="flex-none text-fg2" />
    </button>
  )
}

/**
 * Sessions the player played in, newest first (the prototype's sessListOf): every finished session
 * in the official history with at least one game.
 */
export function playedSessions(sessions: readonly PlayerSessionRecord[]) {
  return sessions
    .filter((session) => session.games.length > 0)
    .slice()
    .sort((a, b) => Date.parse(b.finishedAt) - Date.parse(a.finishedAt))
}

/** Every session as SessionRecordRow (the Sessions page), or “No sessions joined yet.” */
export function SessionRecordList({
  sessions,
  onOpenSession,
}: {
  /** Newest first (playedSessions) */
  sessions: PlayerSessionRecord[]
  onOpenSession: (sessionId: string) => void
}) {
  if (!sessions.length)
    return <p className="m-0 py-5 text-center text-sm text-fg2">No sessions joined yet.</p>
  return (
    <div>
      {sessions.map((session) => (
        <SessionRecordRow
          key={session.id}
          session={session}
          onOpen={() => onOpenSession(session.id)}
        />
      ))}
    </div>
  )
}

export type ProfileSessionsCardProps = {
  /** The player's game history; only sessions with games show, newest first */
  sessions: PlayerSessionRecord[]
  /** A row: opens that session's matches dialog */
  onOpenSession: (sessionId: string) => void
  /** All sessions (N): the player's Sessions page */
  onOpenAll: () => void
}

/**
 * Recent sessions on the profile (2026-11-13-player-recent-sessions-games): the three latest
 * sessions the player played in, newest first, each a SessionRecordRow that opens the session's
 * matches dialog; **All sessions (N)** goes to the Sessions page. Empty: “No sessions joined yet.”
 */
export function ProfileSessionsCard({
  sessions,
  onOpenSession,
  onOpenAll,
}: ProfileSessionsCardProps) {
  const list = playedSessions(sessions)
  return (
    <Card asChild>
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2>Recent sessions</h2>
          {list.length ? (
            <Button size="xs" onClick={onOpenAll}>
              All sessions ({list.length})
            </Button>
          ) : null}
        </div>
        <SessionRecordList sessions={list.slice(0, 3)} onOpenSession={onOpenSession} />
      </section>
    </Card>
  )
}
