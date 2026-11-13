'use client'

import type { PlayerSessionRecord } from '@rotra/data/player/types'
import { Button } from '@rotra/ui/button'
import { DateBlock, formatSessionDay } from '@rotra/ui/date-block'
import { GameRow, type GameRowPlayer, type GameRowProps } from '@rotra/ui/game-row'
import { Icon } from '@rotra/ui/icon'
import { SessionRecordText, sessionRecord } from '@rotra/ui/profile-sessions-card'
import { Sheet } from '@rotra/ui/sheet'

export type SessionMatchesSheetProps = {
  /** The session to show; null keeps the sheet closed */
  session: PlayerSessionRecord | null
  onOpenChange: (open: boolean) => void
  /**
   * Whose matches: “Your” on your own profile, else the display name with “'s” (“Mara's”), per the
   * display-name rule (nickname first).
   */
  whose: string
  /** The profile the games belong to, drawn first on every court */
  me?: GameRowProps['me']
  /** Opens a face's profile card */
  onOpenPlayer?: (player: GameRowPlayer) => void
  /** Your own games: the share icon on each counted court */
  onShareGame?: (sessionId: string, gameId: string) => void
  /** Your own profile: Share performance in the footer */
  onSharePerformance?: (sessionId: string) => void
}

/**
 * The session matches dialog (2026-11-13-player-latest-sessions; the prototype's SHEETS_SESSION),
 * opened from a Recent sessions row or the Sessions page: titled with the session name; a head row
 * with the date block, the date, the club and the counted record (“counted” under it); then
 * “Your matches · N” / “NAME's matches · N” and every match row of that session, fun games marked
 * “Fun game · not counted”. Footer: Close, Share performance (own) and Session page (new tab;
 * hidden when the session page is no longer available).
 */
export function SessionMatchesSheet({
  session,
  onOpenChange,
  whose,
  me,
  onOpenPlayer,
  onShareGame,
  onSharePerformance,
}: SessionMatchesSheetProps) {
  const record = session ? sessionRecord(session) : null
  const at = session ? Date.parse(session.finishedAt) : 0
  return (
    <Sheet
      open={!!session}
      onOpenChange={onOpenChange}
      title={session?.title ?? 'Session'}
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
          {session && onSharePerformance ? (
            <Button onClick={() => onSharePerformance(session.id)}>
              <Icon name="share" size={16} /> Share performance
            </Button>
          ) : null}
          {session?.sessionPageUrl ? (
            <Button asChild variant="primary">
              <a href={session.sessionPageUrl} target="_blank" rel="noopener noreferrer">
                Session page <Icon name="external" />
              </a>
            </Button>
          ) : null}
        </>
      }
    >
      {session && record ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 border-b border-border pb-3">
            <DateBlock at={at} className="size-[46px]" />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <b>{formatSessionDay(at)}</b>
              <span className="text-[13px] text-fg2">{session.clubName}</span>
            </div>
            <span className="flex flex-none flex-col items-end gap-0.5 text-right">
              <SessionRecordText wins={record.wins} losses={record.losses} className="text-lg" />
              <span className="text-[13px] text-fg2">counted</span>
            </span>
          </div>
          <div>
            <span className="text-xs font-semibold tracking-[0.6px] text-fg2 uppercase">
              {whose} matches · {record.matches}
            </span>
            {session.games.map((game) => (
              <GameRow
                key={game.id}
                game={game.counting === 'fun' && !game.note ? { ...game, note: 'Fun game' } : game}
                me={me}
                onOpenPlayer={onOpenPlayer}
                onShare={
                  onShareGame && game.counting === 'counted'
                    ? () => onShareGame(session.id, game.id)
                    : undefined
                }
              />
            ))}
          </div>
        </div>
      ) : null}
    </Sheet>
  )
}
