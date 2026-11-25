import type { MatchPage as MatchPageData, MatchPagePlayer } from '@rotra/data/match-page/types'
import type { PlayerGame } from '@rotra/data/player/types'
import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { formatSessionDay } from '@rotra/ui/date-block'
import { ErrorState } from '@rotra/ui/error-state'
import { GameRow, type GameRowPlayer, type GameRowProps } from '@rotra/ui/game-row'
import { Notice } from '@rotra/ui/notice'
import { Skeleton } from '@rotra/ui/skeleton'
import type { ReactNode } from 'react'

export type MatchPageProps = {
  /** The id in the address, for the not found notice */
  matchId: string
  /** The match page read: undefined while it loads, null when no game has this id */
  page: MatchPageData | null | undefined
  /** The read failed (the page shows Retry) */
  error?: boolean
  retrying?: boolean
  onRetry?: () => void
  /** The page the court was tapped on (a player's name, Games, Sessions), else Leaderboard */
  backLabel: string
  onBack: () => void
  /** Opens a face's profile card */
  onOpenPlayer?: (player: GameRowPlayer) => void
  /** The signed-in player's own games only: Share game (the share icon on the court) */
  onShareGame?: (gameId: string) => void
  /** Opens another game's match page (the Before this game courts) */
  onOpenGame?: (gameId: string) => void
}

const firstName = (name: string) => name.split(/\s+/)[0] ?? name
const flipScore = (score: string) => {
  const parts = score.split('–')
  return parts.length === 2 ? `${parts[1]}–${parts[0]}` : score
}
/** Fun games carry “Fun game · not counted” under the court, as in the session matches dialog. */
const withFunNote = (game: PlayerGame): PlayerGame =>
  game.counting === 'fun' && !game.note ? { ...game, note: 'Fun game' } : game
const face = (player: MatchPagePlayer): GameRowPlayer => ({
  name: player.name,
  picture: player.picture,
  playerId: player.playerId,
  sessionGameNumber: player.sessionGameNumber,
})

/**
 * Who sits on the left: a signed-in player who played sees their side, themselves first; everyone
 * else sees Team A. `flipped` when the left side is Team B (score and winner then turn round).
 */
function drawSides(page: MatchPageData) {
  const viewer = page.viewerPlayerId
  const inA = !!viewer && page.teamA.some((p) => p.playerId === viewer)
  const inB = !!viewer && page.teamB.some((p) => p.playerId === viewer)
  const [mine, theirs] = inB ? [page.teamB, page.teamA] : [page.teamA, page.teamB]
  const left =
    inA || inB
      ? [...mine.filter((p) => p.playerId === viewer), ...mine.filter((p) => p.playerId !== viewer)]
      : mine
  return { left, right: theirs, flipped: inB, own: inA || inB }
}

function Head({
  title,
  backLabel,
  onBack,
}: {
  title: string
  backLabel: string
  onBack: () => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Button variant="ghost" size="sm" className="-ml-2.5 self-start" onClick={onBack}>
        ← {backLabel}
      </Button>
      <h1>{title}</h1>
    </div>
  )
}

/**
 * The match page while it loads: the court and Before this game as placeholders. Without `head`
 * (the route's loading file) the back button and heading are placeholders too.
 */
export function MatchPageSkeleton({ head }: { head?: ReactNode }) {
  return (
    <main
      aria-busy="true"
      aria-label="Loading the game"
      className="mx-auto flex max-w-[920px] flex-col gap-5 px-4 pt-5 pb-[120px]"
    >
      {head ?? (
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-8 w-24" />
        </div>
      )}
      <Card className="flex flex-col gap-3">
        <Skeleton className="h-[132px] rounded-lg max-[480px]:h-[100px]" />
        <Skeleton className="w-2/3" />
      </Card>
      <Card className="flex flex-col gap-3">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-9 w-1/2" />
        <Skeleton className="h-[132px] rounded-lg max-[480px]:h-[100px]" />
        <Skeleton className="h-9 w-1/2" />
      </Card>
    </main>
  )
}

/**
 * P-MATCH-PAGE (`/matches/[matchId]`, 2026-11-25 match page log; the prototype's viewMatch): one
 * game, the same page for every player in it. The game court with skill-group rings (the viewer's
 * side on the left as “You” when they played, else Team A), the muted “session · date · club” line
 * (the title opens the public session page while it exists), then **Before this game**: one block
 * per player, left side then right, with that player's earlier games of the session drawn from
 * their side. Loading, error and **Game not found** states.
 */
export function MatchPage({
  matchId,
  page,
  error = false,
  retrying,
  onRetry,
  backLabel,
  onBack,
  onOpenPlayer,
  onShareGame,
  onOpenGame,
}: MatchPageProps) {
  if (page === null)
    return (
      <main className="mx-auto flex max-w-[640px] flex-col gap-5 px-4 pt-5 pb-[120px]">
        <Head title="Game not found" backLabel={backLabel} onBack={onBack} />
        <Notice>
          No game has the ID <span className="font-mono">{matchId}</span>. Check the link and try
          again.
        </Notice>
      </main>
    )
  if (!page)
    return error ? (
      <main className="mx-auto flex max-w-[920px] flex-col gap-5 px-4 pt-5 pb-[120px]">
        <Head title="Game" backLabel={backLabel} onBack={onBack} />
        <ErrorState title="Couldn't load the game." retrying={retrying} onRetry={onRetry}>
          Check your connection, then try again.
        </ErrorState>
      </main>
    ) : (
      <MatchPageSkeleton head={<Head title="Game" backLabel={backLabel} onBack={onBack} />} />
    )

  const viewer = page.viewerPlayerId
  const { left, right, flipped, own } = drawSides(page)
  const [lead, ...partners] = left
  const skill = new Map(
    [...page.teamA, ...page.teamB].flatMap((p) => (p.playerId ? [[p.playerId, p.skillGroup]] : [])),
  )
  const label = (p: MatchPagePlayer) =>
    viewer && p.playerId === viewer ? 'You' : firstName(p.name)
  const meOf = (p: MatchPagePlayer): NonNullable<GameRowProps['me']> => ({
    name: p.name,
    label: label(p),
    picture: p.picture,
    playerId: p.playerId,
  })
  const leftWon = (page.winner === 'a') !== flipped
  const court: PlayerGame | null = lead
    ? withFunNote({
        id: page.matchId,
        format: page.format,
        partners: partners.map((p) => p.name),
        opponents: right.map((p) => p.name),
        partnerPlayers: partners.map(face),
        opponentPlayers: right.map(face),
        // Won / Lost, the chip and the note read from the left side.
        counting: lead.counting,
        result: leftWon ? 'won' : 'lost',
        score: flipped && page.score ? flipScore(page.score) : page.score,
        ...(page.gameScores
          ? { gameScores: flipped ? page.gameScores.map(flipScore) : page.gameScores }
          : {}),
        note: lead.note,
        sessionGameNumber: lead.sessionGameNumber,
      })
    : null
  const at = Date.parse(page.session.finishedAt)
  const share = (p: MatchPagePlayer) =>
    onShareGame && own && viewer && p.playerId === viewer ? onShareGame : undefined

  return (
    <main className="mx-auto flex max-w-[920px] flex-col gap-5 px-4 pt-5 pb-[120px]">
      <Head title="Game" backLabel={backLabel} onBack={onBack} />
      <Card asChild>
        <section className="flex flex-col gap-3">
          {court && lead ? (
            <GameRow
              game={court}
              me={meOf(lead)}
              onOpenPlayer={onOpenPlayer}
              onShare={(() => {
                const open = share(lead)
                return open ? () => open(page.matchId) : undefined
              })()}
              skillRings={(player) =>
                player.playerId ? (skill.get(player.playerId) ?? null) : null
              }
            />
          ) : null}
          <p className="m-0 text-[13px] text-fg2">
            {page.session.sessionPageUrl ? (
              <a
                href={page.session.sessionPageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-accent no-underline focus-visible:outline-2 focus-visible:outline-accent"
              >
                {page.session.title}
              </a>
            ) : (
              page.session.title
            )}{' '}
            · {formatSessionDay(at)} · {page.session.clubName}
          </p>
        </section>
      </Card>
      <Card asChild>
        <section className="flex flex-col gap-3">
          <h2>Before this game</h2>
          <div className="flex flex-col gap-3 [&>*+*]:border-t [&>*+*]:border-border [&>*+*]:pt-3.5">
            {[...left, ...right].map((player) => {
              const count = player.earlierGames.length
              const open = share(player)
              return (
                <div key={`${player.playerId ?? ''}-${player.name}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {onOpenPlayer ? (
                      <button
                        type="button"
                        aria-label={`${player.name}. View profile`}
                        onClick={() => onOpenPlayer(face(player))}
                        className="group flex min-w-0 cursor-pointer items-center gap-2.5 border-0 bg-transparent p-0 text-left font-[inherit] text-fg"
                      >
                        <Avatar name={player.name} src={player.picture ?? undefined} size={36} />
                        <b className="truncate text-[15px] group-hover:underline group-focus-visible:underline">
                          {label(player)}
                        </b>
                      </button>
                    ) : (
                      <span className="flex min-w-0 items-center gap-2.5">
                        <Avatar name={player.name} src={player.picture ?? undefined} size={36} />
                        <b className="truncate text-[15px]">{label(player)}</b>
                      </span>
                    )}
                    <span className="text-[13px] text-fg2">
                      {count
                        ? `${count} earlier ${count === 1 ? 'game' : 'games'}`
                        : 'No earlier games'}
                    </span>
                  </div>
                  {count ? (
                    <div>
                      {player.earlierGames.map((game) => (
                        <GameRow
                          key={game.id}
                          game={withFunNote(game)}
                          me={meOf(player)}
                          onOpenPlayer={onOpenPlayer}
                          onShare={open ? () => open(game.id) : undefined}
                          onOpen={onOpenGame ? () => onOpenGame(game.id) : undefined}
                          viewerPlayerId={viewer}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </section>
      </Card>
    </main>
  )
}
