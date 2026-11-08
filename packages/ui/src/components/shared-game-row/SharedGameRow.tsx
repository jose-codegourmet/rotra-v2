'use client'

import type { PlayingLevel } from '@rotra/data/player/types'
import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { Chip } from '@rotra/ui/chip'
import { cn } from '@rotra/ui/cn'
import type { CompareFilter } from '@rotra/ui/compare-filter-bar'
import { Icon } from '@rotra/ui/icon'
import { levelLabel } from '@rotra/ui/level-pill'

export type SharedGamePlayer = {
  id: string
  name: string
  /** First name, or “You” for the signed-in player. */
  label: string
  level: PlayingLevel | null
  games: number
  pictureUrl?: string | null
}
export type SharedGame = {
  id: string
  mine: SharedGamePlayer[]
  theirs: SharedGamePlayer[]
  meWon: boolean
  together: boolean
  otherName: string
  dateLabel: string
  sessionTitle: string
  clubName: string
  /** Display score in the viewer's team order, or null when not recorded. */
  score: string | null
}
export type SharedGameRowProps = { game: SharedGame; className?: string }

/** One counted singles/doubles game, using the prototype's 40/30/30 court/session/result grid. */
export function SharedGameRow({ game, className }: SharedGameRowProps) {
  const label = game.together
    ? `Together · ${game.meWon ? 'won' : 'lost'}`
    : game.meWon
      ? 'You won'
      : `${game.otherName} won`
  return (
    <div className={cn('flex flex-col items-start gap-2 border-t border-border py-3', className)}>
      <div className="grid w-full grid-cols-[40%_30%_30%] items-center [&>*]:min-w-0 [&>*]:pr-2">
        <div
          role="group"
          aria-label={`${game.mine.map((p) => p.label).join(' and ')} versus ${game.theirs.map((p) => p.label).join(' and ')}`}
          className="relative grid grid-cols-2 overflow-hidden rounded-lg border border-accent/10 !pr-0"
        >
          <svg
            className="absolute inset-0 block size-full text-accent opacity-10"
            viewBox="0 0 134 61"
            aria-hidden="true"
            preserveAspectRatio="none"
          >
            <g fill="none" stroke="currentColor" strokeWidth="1.2">
              <rect x="1" y="1" width="132" height="59" vectorEffect="non-scaling-stroke" />
              <path
                d="M1 4.6H133M1 56.4H133M47.2 1V60M86.8 1V60M7.6 1V60M126.4 1V60M1 30.5H47.2M86.8 30.5H133"
                vectorEffect="non-scaling-stroke"
              />
            </g>
            <path
              d="M67 -1V62"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="3 2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          {(['mine', 'theirs'] as const).map((side) => {
            const won = side === 'mine' ? game.meWon : !game.meWon
            return (
              <div
                key={side}
                className="relative flex flex-col items-center justify-evenly gap-2.5 px-0.5 py-2.5"
              >
                {game[side].map((player) => (
                  <span
                    key={player.id}
                    className="flex min-w-0 max-w-full flex-col items-center gap-px text-center text-fg"
                  >
                    <span className="relative block">
                      <Avatar
                        name={player.name}
                        src={player.pictureUrl ?? undefined}
                        className={cn(
                          'size-[38px] text-xs ring-2',
                          won ? 'ring-accent' : 'ring-border-strong',
                        )}
                      />
                      <span
                        role="img"
                        aria-label={`${player.label}: ${player.games} games in that session`}
                        className={cn(
                          'absolute -top-1.5 -right-2 grid h-[18px] min-w-[18px] place-items-center rounded-full border-2 bg-bg px-1 text-[11px] font-extrabold tabular-nums',
                          won ? 'border-accent' : 'border-border-strong',
                        )}
                      >
                        {player.games}
                      </span>
                    </span>
                    <b className="mt-1 text-[11px] leading-[1.15] [overflow-wrap:anywhere]">
                      {player.label}
                    </b>
                    <span className="text-[9px] leading-[1.2] text-fg2">
                      {levelLabel(player.level)}
                    </span>
                  </span>
                ))}
              </div>
            )
          })}
        </div>
        <div className="flex flex-col gap-0.5 pl-2.5">
          <b className="text-[13px] [overflow-wrap:anywhere]">{game.dateLabel}</b>
          <span className="text-[13px] [overflow-wrap:anywhere]">{game.sessionTitle}</span>
          <span className="text-[13px] text-fg2 [overflow-wrap:anywhere]">{game.clubName}</span>
        </div>
        <div className="flex flex-col items-end gap-2 text-right">
          <Chip
            tone={game.meWon ? 'accent' : game.together ? 'neutral' : 'error'}
            className="max-w-full text-center leading-[1.2] whitespace-normal"
          >
            {label}
          </Chip>
          <span
            className="text-[22px] font-extrabold whitespace-nowrap tabular-nums"
            aria-label={game.score ? `Score ${game.score}` : 'No score recorded'}
          >
            {game.score ?? '—'}
          </span>
        </div>
      </div>
    </div>
  )
}

export type SharedGamesListProps = {
  /** At most three games from the selected page, newest first. */
  games: SharedGame[]
  total: number
  /** Zero is the newest page. */
  page: number
  filter: CompareFilter
  otherName: string
  onPageChange: (page: number) => void
  className?: string
}

/** The shared-game list shell, including filter-specific empty copy and the three-game pager. */
export function SharedGamesList({
  games,
  total,
  page,
  filter,
  otherName,
  onPageChange,
  className,
}: SharedGamesListProps) {
  const pages = Math.max(1, Math.ceil(total / 3))
  const currentPage = Math.min(Math.max(0, page), pages - 1)
  const empty =
    filter === 'h2h'
      ? `You haven't played against ${otherName} yet.`
      : filter === 'together'
        ? `You haven't played on the same team as ${otherName} yet.`
        : 'No shared games yet.'
  return (
    <Card asChild className={cn('flex flex-col gap-3', className)}>
      <section aria-label="Games you played together or against">
        <h2>Games you played together or against</h2>
        <p className="text-[13px] text-fg2">
          Winners have a green ring. The number on each picture is how many games that player played
          in the session. Your side is on the left of the net; each player's name and level are
          under their picture. Columns: court, session, result.
        </p>
        {games.length > 0 ? (
          <>
            <div>
              {games.slice(0, 3).map((game) => (
                <SharedGameRow key={game.id} game={game} />
              ))}
            </div>
            {pages > 1 ? (
              <nav
                aria-label="Shared games pages"
                className="flex items-center justify-between gap-2 pt-1.5"
              >
                <Button
                  size="sm"
                  disabled={currentPage >= pages - 1}
                  onClick={() => onPageChange(currentPage + 1)}
                >
                  <Icon name="back" /> Older
                </Button>
                <span aria-live="polite" className="text-[13px] text-fg2">
                  {currentPage * 3 + 1}–{Math.min(total, (currentPage + 1) * 3)} of {total}
                </span>
                <Button
                  size="sm"
                  disabled={currentPage === 0}
                  onClick={() => onPageChange(currentPage - 1)}
                >
                  Newer <Icon name="back" className="rotate-180" />
                </Button>
              </nav>
            ) : null}
          </>
        ) : (
          <p className="text-fg2">{empty}</p>
        )}
      </section>
    </Card>
  )
}
