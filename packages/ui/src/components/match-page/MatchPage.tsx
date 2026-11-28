'use client'

import type { MatchPage as MatchPageData, MatchPagePlayer } from '@rotra/data/match-page/types'
import { drawnWinChanceBreakdown, gameFaceKey } from '@rotra/data/player/game-win-chance'
import type { PlayerGame } from '@rotra/data/player/types'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { cn } from '@rotra/ui/cn'
import { formatSessionDay } from '@rotra/ui/date-block'
import { ErrorState } from '@rotra/ui/error-state'
import { GameRow, type GameRowPlayer, withFunGameNote } from '@rotra/ui/game-row'
import { Notice } from '@rotra/ui/notice'
import { PlayerStatsCard } from '@rotra/ui/player-stats-card'
import { Skeleton } from '@rotra/ui/skeleton'
import { VsCard } from '@rotra/ui/vs-card'
import { WinChanceDialog, type WinChanceDialogPlayer } from '@rotra/ui/win-chance-dialog'
import { type ReactNode, useEffect, useId, useRef, useState } from 'react'

export type MatchPageProps = {
  /** The id in the address, for the not found notice and the player picks. */
  matchId: string
  /** The match page read: undefined while it loads, null when no game has this id. */
  page: MatchPageData | null | undefined
  error?: boolean
  retrying?: boolean
  onRetry?: () => void
  /** The page the court was tapped on (a player's name, Games, Sessions), else Leaderboard. */
  backLabel: string
  onBack: () => void
  /** Opens the profile card from the court or a picked player's stats. */
  onOpenPlayer?: (player: GameRowPlayer) => void
  /** The signed-in player's own games only. */
  onShareGame?: (gameId: string) => void
  /** Opens an earlier game's match page. */
  onOpenGame?: (gameId: string) => void
}

const PAGE = 'mx-auto flex max-w-[1240px] flex-col gap-5 px-4 pt-5 pb-[120px]'
const COURT_AND_VS =
  'grid grid-cols-[minmax(0,1fr)] gap-5 min-[900px]:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]'
const COURT_AND_SESSION =
  'grid min-w-0 gap-5 min-[900px]:grid-rows-[minmax(0,4fr)_minmax(84px,1fr)]'
const SESSION_CARD = 'flex min-h-[84px] flex-col justify-center gap-0.5'
const MANILA_YEAR = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', year: 'numeric' })

const firstName = (name: string) => name.split(/\s+/)[0] ?? name
const flipScore = (score: string) => {
  const parts = score.split('–')
  return parts.length === 2 ? `${parts[1]}–${parts[0]}` : score
}

const face = (player: MatchPagePlayer): GameRowPlayer => ({
  name: player.name,
  picture: player.picture,
  playerId: player.playerId,
  sessionGameNumber: player.sessionGameNumber,
})

/** A signed-in player sees their side on the left, themselves first. Other visitors see Team A. */
function drawSides(page: MatchPageData, id: string) {
  const viewer = page.viewerPlayerId
  // `chanceKey`: the face's id in the page's win chance breakdown.
  const a = page.teamA.map((player, ix) => ({
    player,
    id: `${id}-a-${ix}`,
    chanceKey: gameFaceKey('a', ix),
  }))
  const b = page.teamB.map((player, ix) => ({
    player,
    id: `${id}-b-${ix}`,
    chanceKey: gameFaceKey('b', ix),
  }))
  const inA = !!viewer && a.some(({ player }) => player.playerId === viewer)
  const inB = !!viewer && b.some(({ player }) => player.playerId === viewer)
  const [mine, theirs] = inB ? [b, a] : [a, b]
  const left =
    inA || inB
      ? [
          ...mine.filter(({ player }) => player.playerId === viewer),
          ...mine.filter(({ player }) => player.playerId !== viewer),
        ]
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

/** The route loading state previews the court, Session and VS cards. */
export function MatchPageSkeleton({ head }: { head?: ReactNode }) {
  return (
    <main aria-busy="true" aria-label="Loading the game" className={PAGE}>
      {head ?? (
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-8 w-24" />
        </div>
      )}
      <div className={COURT_AND_VS}>
        <div className={COURT_AND_SESSION}>
          <Card className="flex flex-col p-3">
            <Skeleton className="min-h-[220px] flex-1 rounded-lg min-[900px]:min-h-[280px]" />
          </Card>
          <Card className={cn(SESSION_CARD, 'gap-1')}>
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </Card>
        </div>
        <Card className="flex flex-col gap-3">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-[132px] rounded-lg" />
          <Skeleton className="mx-auto h-11 w-24 rounded-full" />
          <Skeleton className="h-[132px] rounded-lg" />
        </Card>
      </div>
    </main>
  )
}

/** The public Game page. A pick belongs to this match and is cleared on navigation. */
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

  return (
    <MatchPageContent
      key={matchId}
      page={page}
      backLabel={backLabel}
      onBack={onBack}
      onOpenPlayer={onOpenPlayer}
      onShareGame={onShareGame}
      onOpenGame={onOpenGame}
    />
  )
}

function MatchPageContent({
  page,
  backLabel,
  onBack,
  onOpenPlayer,
  onShareGame,
  onOpenGame,
}: Pick<MatchPageProps, 'backLabel' | 'onBack' | 'onOpenPlayer' | 'onShareGame' | 'onOpenGame'> & {
  page: MatchPageData
}) {
  const id = useId()
  const statsGrid = useRef<HTMLDivElement>(null)
  const [selection, setSelection] = useState<{ ids: string[]; scroll: boolean }>({
    ids: [],
    scroll: false,
  })
  const picked = selection.ids
  const [chanceOpen, setChanceOpen] = useState(false)

  useEffect(() => {
    if (!selection.scroll) return
    statsGrid.current?.scrollIntoView({
      block: 'nearest',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    })
  }, [selection])

  const pickPlayer = (id: string) => {
    setSelection(({ ids }) =>
      ids.includes(id)
        ? { ids: ids.filter((item) => item !== id), scroll: false }
        : { ids: [id], scroll: true },
    )
  }
  const pickTeam = (team: string[]) => {
    setSelection(({ ids }) =>
      team.length === ids.length && team.every((id) => ids.includes(id))
        ? { ids: [], scroll: false }
        : { ids: team, scroll: true },
    )
  }
  const closeStats = (id: string) => {
    setSelection(({ ids }) => ({ ids: ids.filter((item) => item !== id), scroll: false }))
    document.getElementById(id)?.focus()
  }

  const viewer = page.viewerPlayerId
  const { left, right, flipped, own } = drawSides(page, id)
  const players = [...left, ...right]
  const [lead, ...partners] = left.map(({ player }) => player)
  const pickedPlayers = players.filter(({ id }) => picked.includes(id))
  const year = Number(MANILA_YEAR.format(Date.now()))
  const leftWon = (page.winner === 'a') !== flipped
  const score = flipped && page.score ? flipScore(page.score) : page.score
  const skill = new Map(
    players.flatMap(({ player }) =>
      player.playerId ? [[player.playerId, player.skillGroup]] : [],
    ),
  )
  const label = (player: MatchPagePlayer) =>
    viewer && player.playerId === viewer ? 'You' : firstName(player.name)
  const vsPlayer = ({ id, player }: (typeof players)[number]) => ({
    id,
    name: viewer && player.playerId === viewer ? 'You' : player.name,
    picture: player.picture,
    skillGroup: player.skillGroup,
    guest: !player.playerId,
  })
  const share = (player: MatchPagePlayer) =>
    own && viewer && player.playerId === viewer ? onShareGame : undefined
  const shareCourt = lead ? share(lead) : undefined
  // Win chance (D-2026-11-27-03), read as the court is drawn; never on a partial (not counted) game.
  const breakdown =
    page.winChance && lead && lead.counting !== 'partial'
      ? drawnWinChanceBreakdown(
          page.winChance,
          left.map(({ chanceKey }) => chanceKey),
          right.map(({ chanceKey }) => chanceKey),
        )
      : null
  // The dialog's faces are the court's: a masked name stays masked.
  const chanceFaces: Record<string, WinChanceDialogPlayer> = Object.fromEntries(
    players.map(({ chanceKey, player }) => [
      chanceKey,
      {
        name: player.name,
        shortName: firstName(player.name),
        photoUrl: player.picture ?? undefined,
      },
    ]),
  )
  const openChance = () => setChanceOpen(true)
  const court: PlayerGame | null = lead
    ? withFunGameNote({
        id: page.matchId,
        format: page.format,
        partners: partners.map((player) => player.name),
        opponents: right.map(({ player }) => player.name),
        partnerPlayers: partners.map(face),
        opponentPlayers: right.map(({ player }) => face(player)),
        counting: lead.counting,
        result: leftWon ? 'won' : 'lost',
        score,
        ...(page.gameScores
          ? { gameScores: flipped ? page.gameScores.map(flipScore) : page.gameScores }
          : {}),
        note: lead.note,
        sessionGameNumber: lead.sessionGameNumber,
        ...(breakdown ? { winChance: breakdown.chance, upset: breakdown.upset } : {}),
      })
    : null

  return (
    <main className={PAGE}>
      <Head title="Game" backLabel={backLabel} onBack={onBack} />
      <div className={COURT_AND_VS}>
        <div className={COURT_AND_SESSION}>
          <Card asChild className="p-3">
            <section aria-label="Court" className="flex flex-col">
              {court && lead ? (
                <GameRow
                  size="match-page"
                  game={court}
                  me={{
                    name: lead.name,
                    label: label(lead),
                    picture: lead.picture,
                    playerId: lead.playerId,
                  }}
                  onOpenPlayer={onOpenPlayer}
                  onShare={shareCourt ? () => shareCourt(page.matchId) : undefined}
                  skillRings={(player) =>
                    player.playerId ? (skill.get(player.playerId) ?? null) : null
                  }
                  onOpenWinChance={breakdown ? openChance : undefined}
                />
              ) : null}
            </section>
          </Card>
          <Card asChild>
            <section aria-label="Session" className={SESSION_CARD}>
              <span className="text-[11px] font-bold tracking-[0.6px] text-fg2 uppercase">
                Session
              </span>
              <b className="text-[17px] [overflow-wrap:anywhere]">
                {page.session.sessionPageUrl ? (
                  <a
                    href={page.session.sessionPageUrl}
                    className="font-extrabold text-accent no-underline focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    {page.session.title}
                  </a>
                ) : (
                  page.session.title
                )}
              </b>
              <span className="text-[13px] text-fg2">
                {formatSessionDay(Date.parse(page.session.finishedAt))} · {page.session.clubName}
              </span>
            </section>
          </Card>
        </div>
        <VsCard
          format={page.format}
          score={score}
          left={left.map(vsPlayer)}
          right={right.map(vsPlayer)}
          winner={lead?.counting === 'partial' ? null : leftWon ? 'left' : 'right'}
          picked={picked}
          onPickPlayer={pickPlayer}
          onPickTeam={pickTeam}
          winChance={breakdown ? { chance: breakdown.chance, onOpen: openChance } : undefined}
        />
      </div>
      {pickedPlayers.length ? (
        <div
          ref={statsGrid}
          aria-live="polite"
          className={cn(
            'grid grid-cols-[minmax(0,1fr)] gap-5',
            pickedPlayers.length > 1 &&
              'min-[900px]:grid-cols-[repeat(auto-fit,minmax(420px,1fr))]',
          )}
        >
          {pickedPlayers.map(({ id, player }) => (
            <PlayerStatsCard
              key={id}
              player={player}
              year={year}
              viewerPlayerId={viewer}
              onClose={() => closeStats(id)}
              onOpenPlayer={onOpenPlayer}
              onOpenGame={onOpenGame}
              onShareGame={share(player)}
            />
          ))}
        </div>
      ) : null}
      <WinChanceDialog
        open={chanceOpen}
        onClose={() => setChanceOpen(false)}
        breakdown={breakdown}
        players={chanceFaces}
      />
    </main>
  )
}
