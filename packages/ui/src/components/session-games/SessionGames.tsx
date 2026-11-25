import type { PlayerSessionRecord } from '@rotra/data/player/types'
import { Button } from '@rotra/ui/button'
import { GameRow, type GameRowPlayer, type GameRowProps } from '@rotra/ui/game-row'
import { Icon } from '@rotra/ui/icon'
import { NotRankedChip } from '@rotra/ui/not-ranked-chip'
import type { ReactNode } from 'react'
export type SessionGamesProps = {
  session: PlayerSessionRecord
  /** The profile owner, drawn first on every court */
  me?: GameRowProps['me']
  /** Opens a face's profile card */
  onOpenPlayer?: (player: GameRowPlayer) => void
  /** Your own games: the share icon on each court (Share game) */
  onShareGame?: (gameId: string) => void
  /** Opens a game's match page: the whole court box (2026-11-25 match page log) */
  onOpenGame?: (gameId: string) => void
  /** Between the session head and the games: the Share performance / result / games row */
  actions?: ReactNode
}
export function SessionGames({
  session,
  me,
  onOpenPlayer,
  onShareGame,
  onOpenGame,
  actions,
}: SessionGamesProps) {
  return (
    <section className="flex flex-col gap-1">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-2 border-b border-border pb-1">
        <div className="min-w-0">
          <h3 className="text-[15px] font-bold">{session.title}</h3>
          <p className="text-[13px] text-fg2">
            {new Date(session.finishedAt).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              timeZone: 'Asia/Manila',
            })}{' '}
            · {session.clubName}
            {session.ranked === false ? ' · ' : null}
            {session.ranked === false ? <NotRankedChip /> : null}
          </p>
        </div>
        {session.sessionPageUrl ? (
          <Button asChild variant="ghost" size="xs">
            <a href={session.sessionPageUrl} target="_blank" rel="noopener noreferrer">
              Session page <Icon name="external" />
            </a>
          </Button>
        ) : (
          <span className="text-[13px] text-fg2">Session page no longer available</span>
        )}
      </div>
      {actions}
      <div>
        {session.games.map((game) => (
          <GameRow
            key={game.id}
            game={game}
            me={me}
            onOpenPlayer={onOpenPlayer}
            onShare={onShareGame ? () => onShareGame(game.id) : undefined}
            onOpen={onOpenGame ? () => onOpenGame(game.id) : undefined}
          />
        ))}
      </div>
    </section>
  )
}
