import type { MatchPagePlayer } from '@rotra/data/match-page/types'
import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { GameRow, type GameRowPlayer, withFunGameNote } from '@rotra/ui/game-row'
import { ProfileLatestStats } from '@rotra/ui/profile-banner-card'

export type PlayerStatsCardProps = {
  player: MatchPagePlayer
  year: number
  viewerPlayerId?: string | null
  onOpenPlayer?: (player: GameRowPlayer) => void
  onClose: () => void
  onOpenGame?: (gameId: string) => void
  onShareGame?: (gameId: string) => void
}

/** A picked player's record and earlier games of the session, drawn from their side. */
export function PlayerStatsCard({
  player,
  year,
  viewerPlayerId,
  onOpenPlayer,
  onClose,
  onOpenGame,
  onShareGame,
}: PlayerStatsCardProps) {
  const isYou = !!viewerPlayerId && viewerPlayerId === player.playerId
  const name = isYou ? 'You' : player.name
  const courtLabel = isYou ? 'You' : (player.name.split(/\s+/)[0] ?? player.name)
  const { playerId, picture, sessionGameNumber, beforeGame, yearWinRate, earlierGames } = player
  const courtFace = { name: player.name, picture, playerId, sessionGameNumber }
  const stats = {
    games: beforeGame?.played ?? null,
    wins: beforeGame?.wins ?? null,
    losses: beforeGame?.losses ?? null,
    winRate: beforeGame?.winRate ?? null,
  }
  const yearTitle = !playerId
    ? 'Guest, no profile'
    : beforeGame === null
      ? 'Private profile'
      : 'Counted-game win rate this year'

  return (
    <Card asChild>
      <section aria-label={`${name} before this game`} className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar name={name} src={picture ?? undefined} size={36} />
            <div className="min-w-0">
              <h2 className="m-0 [overflow-wrap:anywhere]">{name}</h2>
              <span className="text-[13px] text-fg2">Before this game</span>
            </div>
          </div>
          <div className="flex flex-none items-center gap-2">
            {onOpenPlayer ? (
              <Button size="xs" onClick={() => onOpenPlayer(courtFace)}>
                Profile
              </Button>
            ) : null}
            <Button
              aria-label={`Close ${name}'s stats`}
              size="xs"
              variant="ghost"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </div>
        <ProfileLatestStats
          year={year}
          stats={stats}
          context={{
            label: 'Before this game',
            gamesLabel: 'Played',
            yearLabel: `${year} · ${yearWinRate == null ? '—' : `${yearWinRate}%`}`,
            yearTitle,
          }}
        />
        {earlierGames.length ? (
          <div>
            {earlierGames.map((game) => (
              <GameRow
                key={game.id}
                game={withFunGameNote(game)}
                me={{ ...courtFace, label: courtLabel }}
                onOpenPlayer={onOpenPlayer}
                onOpen={onOpenGame ? () => onOpenGame(game.id) : undefined}
                onShare={onShareGame ? () => onShareGame(game.id) : undefined}
                viewerPlayerId={viewerPlayerId}
              />
            ))}
          </div>
        ) : (
          <p className="m-0 px-3 py-6 text-center text-sm text-fg2">
            This was {isYou ? 'your' : 'their'} first game of the session.
          </p>
        )}
      </section>
    </Card>
  )
}
