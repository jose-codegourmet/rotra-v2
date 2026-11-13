import type { PlayerSessionRecord } from '@rotra/data/player/types'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { formatSessionDay } from '@rotra/ui/date-block'
import { GameRow, type GameRowPlayer, type GameRowProps } from '@rotra/ui/game-row'
export type RecentGamesCardProps = {
  sessions: PlayerSessionRecord[]
  onOpenAll: () => void
  /** The profile owner, drawn first on every court */
  me?: GameRowProps['me']
  /** Opens a face's profile card */
  onOpenPlayer?: (player: GameRowPlayer) => void
  /** Your own games: the share icon on each court (Share game) */
  onShareGame?: (sessionId: string, gameId: string) => void
}

/**
 * Recent games on the profile (2026-11-13-player-recent-sessions-games): the three latest games
 * (newest session first, its last game first), each the standard game row with “session · date ·
 * club” under it; **All games (N)** (every game) opens the Games page. Empty: “No games recorded
 * yet.”
 */
export function RecentGamesCard({
  sessions,
  onOpenAll,
  me,
  onOpenPlayer,
  onShareGame,
}: RecentGamesCardProps) {
  const ordered = sessions
    .slice()
    .sort((a, b) => Date.parse(b.finishedAt) - Date.parse(a.finishedAt))
  const games = ordered.flatMap((session) =>
    session.games
      .slice()
      .reverse()
      .map((game) => ({ game, session })),
  )
  return (
    <Card asChild>
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2>Recent games</h2>
          {games.length > 0 && (
            <Button size="xs" onClick={onOpenAll}>
              All games ({games.length})
            </Button>
          )}
        </div>
        {games.length ? (
          <div className="flex flex-col [&>*+*]:border-t [&>*+*]:border-border">
            {games.slice(0, 3).map(({ game, session }) => (
              <GameRow
                key={game.id}
                game={game}
                me={me}
                onOpenPlayer={onOpenPlayer}
                onShare={
                  onShareGame && game.counting !== 'partial'
                    ? () => onShareGame(session.id, game.id)
                    : undefined
                }
                dateLine={`${session.title} · ${formatSessionDay(Date.parse(session.finishedAt))} · ${session.clubName}`}
              />
            ))}
          </div>
        ) : (
          <p className="m-0 py-5 text-center text-sm text-fg2">No games recorded yet.</p>
        )}
      </section>
    </Card>
  )
}
