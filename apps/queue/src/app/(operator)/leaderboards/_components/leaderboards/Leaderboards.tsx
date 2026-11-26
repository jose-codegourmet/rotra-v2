'use client'

import { useClub } from '@rotra/data/club'
import { useClubPlayers } from '@rotra/data/club-player/useClubPlayers'
import { DEMO_CLUB_ID } from '@rotra/data/fixtures/clubs'
import { PLAYER_FIXTURE_NOW } from '@rotra/data/fixtures/player-games'
import { leaderboardPeriodStart } from '@rotra/data/leaderboard/rules'
import type { LeaderboardRow as LeaderboardRowData } from '@rotra/data/leaderboard/types'
import { useClubLeaderboard } from '@rotra/data/leaderboard/useClubLeaderboard'
import { useLeaderboard } from '@rotra/data/leaderboard/useLeaderboard'
import { profileCharacterImage } from '@rotra/data/profile-character/images'
import { isRealDataMode } from '@rotra/data/real/mode'
import { Card } from '@rotra/ui/card'
import { EmptyState } from '@rotra/ui/empty-state'
import { LeaderboardList } from '@rotra/ui/leaderboard-list'
import {
  LEADERBOARD_PERIOD_COPY,
  type LeaderboardPeriod,
  LeaderboardPeriodSwitch,
  leaderboardWinsLabel,
} from '@rotra/ui/leaderboard-period-switch'
import { LeaderboardRow } from '@rotra/ui/leaderboard-row'
import { PageHeader } from '@rotra/ui/page-header'
import { PodiumPlaceDialog } from '@rotra/ui/podium-place-dialog'
import { profilePictureSrc } from '@rotra/ui/profile-picture'
import { Skeleton } from '@rotra/ui/skeleton'
import { Tabs, TabsContent } from '@rotra/ui/tabs'
import { type PodiumPosition, TopThreePodium } from '@rotra/ui/top-three-podium'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { QueryError } from '@/app/(operator)/_components/query-error/QueryError'
import { LeaderboardProfile } from '@/app/(operator)/leaderboards/_components/leaderboard-profile/LeaderboardProfile'
import { useAppSelector } from '@/store/hooks'
import { selectAccount } from '@/store/slices/authSlice'

type Board = 'club' | 'rotra'

const TOP = 50
const DAY = 86_400_000

/** "2026", "Q4 2026 · Oct 1 to Dec 31", "November 2026", "Nov 23 to Nov 29" (calendar periods in Manila time). */
function periodLabel(period: LeaderboardPeriod, start: number) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    })
      .formatToParts(start)
      .map((part) => [part.type, part.value]),
  )
  const year = Number(parts.year)
  const month = Number(parts.month) - 1
  const day = Number(parts.day)
  const short = (at: number) =>
    new Date(at).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' })
  if (period === 'year') return String(year)
  if (period === 'quarter') {
    const quarter = Math.floor(month / 3)
    return `Q${quarter + 1} ${year} · ${short(Date.UTC(year, quarter * 3, 1))} to ${short(Date.UTC(year, quarter * 3 + 3, 0))}`
  }
  if (period === 'month')
    return new Date(Date.UTC(year, month, 1)).toLocaleDateString('en-US', {
      timeZone: 'UTC',
      month: 'long',
      year: 'numeric',
    })
  const monday = Date.UTC(year, month, day)
  return `${short(monday)} to ${short(monday + 6 * DAY)}`
}

const winRate = (row: Pick<LeaderboardRowData, 'wins' | 'losses'>) =>
  row.wins + row.losses ? Math.round((row.wins / (row.wins + row.losses)) * 100) : 0

/** Avatar consumers need a URL; a stored character reference is not an image URL. */
const pictureOf = (row: LeaderboardRowData) =>
  profileCharacterImage(row.pictureUrl) ?? profilePictureSrc(row.pictureUrl, row.id, row.fullName)

/**
 * Q-LEADERBOARDS (D-2026-11-25-04; rotra-queue.html viewLeaderboards): Club and ROTRA boards
 * (`?tab=rotra`), each with Top annual, Top quarterly, Top monthly and Top weekly. The podium holds
 * places 1 to 3 (a shared place opens Podium place), then places 4 to 50 in the list, then "Who
 * appears here". Only this club's players open a profile.
 */
export function Leaderboards() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const board: Board = params.get('tab') === 'rotra' ? 'rotra' : 'club'
  const [period, setPeriod] = useState<LeaderboardPeriod>('year')
  const clubId = useAppSelector(selectAccount)?.id ?? DEMO_CLUB_ID
  const clubName = useClub(clubId).data?.name ?? 'your club'
  const panel = { period, onPeriod: setPeriod, clubId, clubName }
  const changeBoard = (next: string) =>
    router.replace(next === 'rotra' ? `${pathname}?tab=rotra` : pathname, { scroll: false })

  return (
    <main className="flex flex-col gap-5 px-page pt-5 pb-[120px]">
      <PageHeader
        title="Leaderboards"
        description={`${board === 'club' ? `The top ${TOP} in ${clubName}'s sessions` : `The top ${TOP} across every club on ROTRA`}. Most wins in standard matches ${LEADERBOARD_PERIOD_COPY[period].current} comes first. Singles and doubles count together.`}
      />
      <Tabs
        aria-label="Leaderboards"
        items={[
          { value: 'club', label: 'Club' },
          { value: 'rotra', label: 'ROTRA' },
        ]}
        value={board}
        onChange={changeBoard}
      >
        <TabsContent value="club">
          <BoardPanel board="club" {...panel} />
        </TabsContent>
        <TabsContent value="rotra">
          <BoardPanel board="rotra" {...panel} />
        </TabsContent>
      </Tabs>
    </main>
  )
}

function BoardPanel({
  board,
  period,
  onPeriod,
  clubId,
  clubName,
}: {
  board: Board
  period: LeaderboardPeriod
  onPeriod: (period: LeaderboardPeriod) => void
  /** The signed-in club account */
  clubId: string
  clubName: string
}) {
  const clubPlayers = useClubPlayers()
  const clubBoard = useClubLeaderboard(board === 'club' ? clubId : '', period)
  const rotraBoard = useLeaderboard(period)
  const query = board === 'club' ? clubBoard : rotraBoard
  const [place, setPlace] = useState<PodiumPosition | null>(null)
  const [profile, setProfile] = useState<{ id: string; fromPlace?: PodiumPosition } | null>(null)

  // The list holds the top 50 plus anyone sharing the 50th place: read every page.
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const copy = LEADERBOARD_PERIOD_COPY[period]
  const start = query.data?.pages[0]?.periodStart
  const dateLabel = periodLabel(
    period,
    start
      ? Date.parse(start)
      : leaderboardPeriodStart(
          period,
          isRealDataMode() ? Date.now() : PLAYER_FIXTURE_NOW.getTime(),
        ),
  )
  const rows = query.data?.pages.flatMap((page) => page.entries) ?? []
  /** This club's saved player for a ROTRA player id; other clubs' players open nothing. */
  const clubPlayerOf = (id: string) => clubPlayers.data?.players.find((p) => p.playerId === id)
  const clubOf = (row: LeaderboardRowData) =>
    board === 'rotra' && clubPlayerOf(row.id) ? clubName : undefined
  const sharedPlace = (position: number) => rows.filter((r) => r.position === position).length > 1
  const openPlayer = (id: string, fromPlace?: PodiumPosition) => {
    const saved = clubPlayerOf(id)
    if (saved) setProfile({ id: saved.id, fromPlace })
  }

  const places = ([1, 2, 3] as const).map((position) => ({
    position,
    players: rows
      .filter((row) => row.position === position)
      .map((row) => ({
        id: row.id,
        name: row.fullName,
        pictureUrl: pictureOf(row),
        stat: leaderboardWinsLabel(row.wins),
        statSpoken: `${leaderboardWinsLabel(row.wins)}, ${winRate(row)}% win rate`,
        canOpen: Boolean(clubPlayerOf(row.id)),
      })),
  }))
  const inPlace = place ? rows.filter((row) => row.position === place) : []
  const list = rows.filter((row) => row.position > 3)
  const loading = query.isPending || (query.hasNextPage ?? false)

  return (
    <div className="flex flex-col gap-5">
      <LeaderboardPeriodSwitch period={period} dateLabel={dateLabel} onChange={onPeriod} />
      {query.isError ? (
        <QueryError query={query} title="Couldn't load the leaderboard." />
      ) : loading ? (
        <div
          role="status"
          aria-busy
          aria-label="Loading the leaderboard"
          className="flex flex-col gap-5"
        >
          <Skeleton className="h-72 rounded-lg" />
          <Skeleton className="h-56 rounded-lg" />
        </div>
      ) : (
        <>
          <TopThreePodium
            places={places}
            caption={`${copy.label} · ${dateLabel} · top ${TOP}`}
            onOpenPlayer={(id) => openPlayer(id)}
            onOpenPlace={setPlace}
          />
          <Card>
            {!rows.length ? (
              <EmptyState>
                No one has won a standard match {copy.current} yet. The list fills as{' '}
                {board === 'club' ? 'your sessions finish' : 'clubs finish sessions'}.
              </EmptyState>
            ) : list.length ? (
              <LeaderboardList period={period}>
                {list.map((row) => {
                  const saved = clubPlayerOf(row.id)
                  return (
                    <LeaderboardRow
                      key={row.id}
                      period={period}
                      position={row.position}
                      previousPosition={row.previousPosition}
                      fullName={row.fullName}
                      picture={{ src: pictureOf(row) }}
                      wins={row.wins}
                      winRate={winRate(row)}
                      club={clubOf(row)}
                      shared={sharedPlace(row.position)}
                      onSelect={saved ? () => setProfile({ id: saved.id }) : undefined}
                    />
                  )
                })}
              </LeaderboardList>
            ) : (
              <p className="m-0 text-[13px] text-fg2">Everyone on this list is on the podium.</p>
            )}
          </Card>
        </>
      )}
      <Card className="flex flex-col gap-2">
        <h2>Who appears here</h2>
        <ul className="m-0 flex flex-col gap-1.5 pl-5 text-[13px] text-fg2">
          <li>
            <b className="text-fg">Club</b> counts wins in your club's sessions only.{' '}
            <b className="text-fg">ROTRA</b> counts them across every club.
          </li>
          <li>
            Top annual, Top quarterly, Top monthly and Top weekly each list the {TOP} players with
            the most wins in standard matches in that year, calendar quarter, month or week (Monday
            to Sunday), in Manila time. Each list starts again when a new period begins.
          </li>
          <li>
            Players with the same wins and the same win rate share a place. Tap a shared place on
            the podium to see who is in it.
          </li>
          <li>
            Fun games, partial games after a substitution, games from not-ranked sessions, and
            invalid games or sessions don't count.
          </li>
          <li>
            The mark beside a place shows the move since the period before: up, down, or{' '}
            <b className="text-fg">New</b> when the player wasn't on that list then.
          </li>
          {board === 'rotra' ? (
            <li>
              Players from other clubs show their club. Only your club's players open a profile
              here.
            </li>
          ) : null}
        </ul>
      </Card>
      {place ? (
        <PodiumPlaceDialog
          open
          onOpenChange={(open) => {
            if (!open) setPlace(null)
          }}
          position={place}
          statLayout="inline"
          description={
            inPlace[0]
              ? `Same wins and win rate: ${leaderboardWinsLabel(inPlace[0].wins)} and ${winRate(inPlace[0])}% each ${copy.current}.`
              : undefined
          }
          players={inPlace.map((row) => ({
            id: row.id,
            name: row.fullName,
            pictureUrl: pictureOf(row),
            club: clubOf(row),
            canOpen: Boolean(clubPlayerOf(row.id)),
            stats: [
              { value: String(row.wins), label: 'W' },
              { value: String(row.losses), label: 'L' },
              { value: String(row.wins + row.losses), label: 'games' },
              { value: `${winRate(row)}%`, label: 'win rate' },
            ],
            statsSpoken: `${row.wins} won, ${row.losses} lost, ${row.wins + row.losses} games, ${winRate(row)}% win rate`,
          }))}
          onOpenPlayer={(id) => {
            const from = place
            setPlace(null)
            openPlayer(id, from)
          }}
        />
      ) : null}
      <LeaderboardProfile
        clubPlayerId={profile?.id ?? null}
        onClose={() => setProfile(null)}
        onBackToPlace={
          profile?.fromPlace
            ? () => {
                setPlace(profile.fromPlace ?? null)
                setProfile(null)
              }
            : undefined
        }
      />
    </div>
  )
}
