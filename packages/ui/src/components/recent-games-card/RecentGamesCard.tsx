import type { PlayerSessionRecord } from '@rotra/data/player/types'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { GameRow } from '@rotra/ui/game-row'
export type RecentGamesCardProps = { sessions: PlayerSessionRecord[]; onOpenAll: () => void }
export function RecentGamesCard({ sessions, onOpenAll }: RecentGamesCardProps) {
  const games = sessions.flatMap((session) =>
    session.games.filter((game) => game.counting === 'counted').map((game) => ({ game, session })),
  )
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold">Recent games</h2>
        {games.length > 0 && (
          <Button size="xs" onClick={onOpenAll}>
            All games ({games.length})
          </Button>
        )}
      </div>
      {games.length ? (
        <div>
          {games.slice(0, 3).map(({ game, session }) => (
            <GameRow
              key={game.id}
              game={game}
              dateLine={`${new Date(session.finishedAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'Asia/Manila' })} · ${session.clubName}`}
            />
          ))}
        </div>
      ) : (
        <p className="py-5 text-center text-sm text-fg2">No recorded games yet.</p>
      )}
    </Card>
  )
}
