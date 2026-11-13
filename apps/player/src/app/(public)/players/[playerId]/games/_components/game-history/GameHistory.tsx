'use client'
import { manilaYear, sessionWeekday, weeklyPerformance } from '@rotra/data/player/rules'
import type { PlayerGame, PlayerSessionRecord } from '@rotra/data/player/types'
import { useMySessions } from '@rotra/data/player/useMySessions'
import { usePlayerGames } from '@rotra/data/player/usePlayerGames'
import { usePlayerProfile } from '@rotra/data/player/usePlayerProfile'
import { usePlayerRank } from '@rotra/data/player/usePlayerRank'
import { PROFILE_LOGIN_MESSAGE } from '@rotra/data/player/visibility'
import { Button } from '@rotra/ui/button'
import { ErrorState } from '@rotra/ui/error-state'
import type { GameRowPlayer } from '@rotra/ui/game-row'
import { MatchHistory } from '@rotra/ui/match-history'
import { Notice } from '@rotra/ui/notice'
import { PageHeader } from '@rotra/ui/page-header'
import { ProfileNotFound } from '@rotra/ui/profile-not-found'
import {
  WeeklyPerformanceChart,
  type WeeklyPerformanceFilter,
} from '@rotra/ui/weekly-performance-chart'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { GamePlayerProfile } from '@/app/_components/game-player-profile/GamePlayerProfile'
import { pictureSrc } from '@/app/_components/profile-picture/pictureSrc'
import { usePlayerShareSheet } from '@/app/_components/share/usePlayerShareSheet'
import { useAppSelector } from '@/store/hooks'
import { selectAccount } from '@/store/slices/authSlice'
import { selectDev } from '@/store/slices/devSlice'
import Loading from '../../loading'
export function GameHistory({ playerId }: { playerId: string }) {
  const rank = usePlayerRank(playerId),
    games = usePlayerGames(playerId),
    router = useRouter()
  const [activeTab, setActiveTab] = useState<'counted' | 'other'>('counted')
  // Weekly performance bar filter and the page of sessions; both reset to page 1 (2026-11-13 logs).
  const [filter, setFilter] = useState<WeeklyPerformanceFilter | null>(null)
  const [page, setPage] = useState(1)
  const [openPlayer, setOpenPlayer] = useState<GameRowPlayer | null>(null)
  const profile = usePlayerProfile(playerId)
  const player = rank.data
  const account = useAppSelector(selectAccount),
    { offline } = useAppSelector(selectDev)
  const sharing = usePlayerShareSheet(account?.id === playerId ? playerId : null)
  const mySessions = useMySessions(account?.id === playerId ? playerId : null)
  if (
    rank.error?.message === PROFILE_LOGIN_MESSAGE ||
    games.error?.message === PROFILE_LOGIN_MESSAGE
  )
    return (
      <main className="mx-auto max-w-[920px] px-4 pt-5">
        <ProfileNotFound
          id={playerId ?? ''}
          loginRequired
          onSignIn={() =>
            router.push(`/login?returnTo=${encodeURIComponent(`/players/${playerId}/games`)}`)
          }
        />
      </main>
    )
  if (rank.data === null)
    return (
      <main className="mx-auto max-w-[920px] px-4 pt-5">
        <ProfileNotFound id={playerId} />
      </main>
    )
  if ((rank.isError || games.isError) && (!player || !games.data || !offline))
    return (
      <main className="mx-auto max-w-[920px] px-4 pt-5">
        <ErrorState
          title="Couldn't load game history."
          retryLabel="Retry"
          retrying={rank.isFetching || games.isFetching}
          onRetry={() => {
            void rank.refetch()
            void games.refetch()
          }}
        >
          Check your connection, then try again.
        </ErrorState>
      </main>
    )
  if (!player || !games.data) return <Loading />
  const own = account?.id === playerId
  const year = manilaYear(Date.now())
  const gameFilter = filter
    ? (session: PlayerSessionRecord, game: PlayerGame) =>
        manilaYear(session.finishedAt) === year &&
        sessionWeekday(session.finishedAt) === filter.day &&
        game.result === filter.result
    : null
  const notices: string[] = []
  if (player.state === 'needs_reassessment')
    notices.push(
      'None of these games are from the last three months, so they no longer count toward the leaderboard.',
    )
  if (player.updatePending)
    notices.push(
      `${player.updatePending.sessionTitle} games are in, but the rank update from them is still processing.`,
    )
  return (
    <main className="mx-auto flex max-w-[920px] flex-col gap-5 px-4 pt-5 pb-[120px]">
      <Button
        variant="ghost"
        size="sm"
        className="self-start"
        onClick={() => router.push(`/players/${playerId}`)}
      >
        ← {player.fullName}
      </Button>
      <PageHeader
        eyebrow={player.fullName}
        title="Games"
        description="Official results from finished club sessions. Results are final and can't be edited."
      />
      {offline && account?.id === playerId ? (
        <Notice tone="warn">
          Saved copy. Your rank and games may have changed since this device was last online.
        </Notice>
      ) : null}
      <WeeklyPerformanceChart
        days={weeklyPerformance(games.data, year)}
        year={year}
        filter={filter}
        onFilterChange={(next) => {
          setFilter(next)
          setPage(1)
          // Tapping a bar on Fun and partial switches to Singles and doubles and filters there.
          if (next) setActiveTab('counted')
        }}
      />
      <MatchHistory
        sessions={games.data}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab)
          setFilter(null)
          setPage(1)
        }}
        notices={notices}
        page={page}
        onPageChange={setPage}
        gameFilter={gameFilter}
        me={{
          name: player.fullName,
          label: own ? 'You' : (player.fullName.split(/\s+/)[0] ?? player.fullName),
          picture: pictureSrc(profile.data?.picture, playerId, player.fullName) ?? null,
          playerId,
        }}
        onOpenPlayer={setOpenPlayer}
        publication={own ? (mySessions.data?.publication ?? {}) : undefined}
        onSharePerformance={own ? sharing.openPerformance : undefined}
        onShareResult={own ? sharing.openResult : undefined}
        onShareGames={own ? sharing.openGames : undefined}
        onShareGame={own ? sharing.openGame : undefined}
      />
      <GamePlayerProfile
        player={openPlayer}
        viewerId={account?.id}
        onClose={() => setOpenPlayer(null)}
      />
      {sharing.sheet}
    </main>
  )
}
