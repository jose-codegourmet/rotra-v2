import type { PlayerSessionRecord } from '@rotra/data/player/types'
import { Button } from '@rotra/ui/button'
import { GameRow } from '@rotra/ui/game-row'
import { Icon } from '@rotra/ui/icon'
export type SessionGamesProps = { session: PlayerSessionRecord }
export function SessionGames({ session }: SessionGamesProps) {
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
      <div>
        {session.games.map((game) => (
          <GameRow key={game.id} game={game} />
        ))}
      </div>
    </section>
  )
}
