'use client'
import { PLAYER_FIXTURE_NOW } from '@rotra/data/fixtures/player-games'
import { leaderboardKeys } from '@rotra/data/leaderboard/query-keys'
import { leaderboardPeriodStart } from '@rotra/data/leaderboard/rules'
import {
  LEADERBOARD_LIMIT,
  LEADERBOARD_PERIODS,
  type LeaderboardPage as LeaderboardPageData,
  type LeaderboardPeriod,
  type LeaderboardRow as LeaderboardRowData,
} from '@rotra/data/leaderboard/types'
import { useLeaderboard } from '@rotra/data/leaderboard/useLeaderboard'
import { useLeaderboardSearch } from '@rotra/data/leaderboard/useLeaderboardSearch'
import { useMyPeriodPosition } from '@rotra/data/leaderboard/useMyPeriodPosition'
import { usePlayerProfile } from '@rotra/data/player/usePlayerProfile'
import { isRealDataMode } from '@rotra/data/real/mode'
import { useThrottledRefresh } from '@rotra/data/refresh/useThrottledRefresh'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { EmptyState } from '@rotra/ui/empty-state'
import { ErrorState } from '@rotra/ui/error-state'
import { usePhotoViewer } from '@rotra/ui/hooks/use-photo-viewer'
import { LeaderboardList } from '@rotra/ui/leaderboard-list'
import {
  LEADERBOARD_PERIOD_COPY,
  LeaderboardPeriodSwitch,
} from '@rotra/ui/leaderboard-period-switch'
import { LeaderboardRow } from '@rotra/ui/leaderboard-row'
import { LeaderboardRulesCard } from '@rotra/ui/leaderboard-rules-card'
import { LeaderboardSearch } from '@rotra/ui/leaderboard-search'
import { MyPositionCard } from '@rotra/ui/my-position-card'
import { Notice } from '@rotra/ui/notice'
import { PageHeader } from '@rotra/ui/page-header'
import { PhotoViewer } from '@rotra/ui/photo-viewer'
import { PullToRefresh } from '@rotra/ui/pull-to-refresh'
import { type PodiumEntry, TopThreePodium } from '@rotra/ui/top-three-podium'
import { type InfiniteData, useQueryClient } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ProfileCard, type ProfileCardPerson } from '@/app/_components/profile-card/ProfileCard'
import { pictureSrc } from '@/app/_components/profile-picture/pictureSrc'
import { useAppSelector } from '@/store/hooks'
import { selectAccount } from '@/store/slices/authSlice'
import { selectDev } from '@/store/slices/devSlice'

const periodFormatters = {
  year: new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', year: 'numeric' }),
  month: new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    month: 'long',
    year: 'numeric',
  }),
  week: new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
  }),
}

function periodDateLabel(period: LeaderboardPeriod, periodStart?: string) {
  const timestamp = periodStart
    ? Date.parse(periodStart)
    : leaderboardPeriodStart(period, isRealDataMode() ? Date.now() : PLAYER_FIXTURE_NOW.getTime())
  const formatter = periodFormatters[period]
  if (period !== 'week') return formatter.format(timestamp)
  return `${formatter.format(timestamp)} to ${formatter.format(timestamp + 6 * 86_400_000)}`
}

function profileCardAvailable(entry: LeaderboardRowData) {
  // Private rows for visitors are inert. Always private rows can open the masked dialog.
  return !entry.masked || entry.levelHidden
}

export function LeaderboardPage({
  focusPlayerId,
  initialQuery,
}: {
  focusPlayerId?: string
  initialQuery?: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const client = useQueryClient()
  const account = useAppSelector(selectAccount)
  const dev = useAppSelector(selectDev)
  const viewerId = account?.id
  const requestedPeriod = searchParams.get('period')
  const period = LEADERBOARD_PERIODS.find((value) => value === requestedPeriod) ?? 'year'
  const [query, setQuery] = useState(initialQuery ?? '')
  const [jumpTo, setJumpTo] = useState<string | null>(focusPlayerId ?? null)
  const [flashId, setFlashId] = useState<string | null>(null)
  const [offlineRetry, setOfflineRetry] = useState(false)
  const [card, setCard] = useState<ProfileCardPerson | null>(null)
  const board = useLeaderboard(period, viewerId)
  const search = useLeaderboardSearch(query, period, viewerId)
  const position = useMyPeriodPosition(viewerId, period)
  const ownProfile = usePlayerProfile(viewerId ?? '')
  const photo = usePhotoViewer()
  const entries = board.data?.pages.flatMap((page) => page.entries) ?? []
  const total = board.data?.pages[0]?.total ?? 0
  const dateLabel = periodDateLabel(period, board.data?.pages[0]?.periodStart)
  const when = LEADERBOARD_PERIOD_COPY[period].current
  const nameSearch = Boolean(query.trim()) && !/^RTR-/i.test(query.trim())
  const active = nameSearch ? search : board
  const refresh = () =>
    Promise.all([
      board.refetch(),
      ...(nameSearch ? [search.refetch()] : []),
      ...(viewerId ? [position.refetch()] : []),
    ])
  const refreshing = useThrottledRefresh(refresh, { refreshOnReturn: true })
  const mockScenario = isRealDataMode() ? null : dev.leaderboardScenario
  const loading = mockScenario === 'loading' || (active.isPending && !active.data)
  const failed =
    mockScenario === 'error' || (active.isError && (!active.data || (dev.offline && offlineRetry)))
  const empty = !loading && !failed && board.data && total === 0
  const podium = !loading && !failed && !nameSearch && entries.length >= 3
  const shownEntries = nameSearch ? (search.data?.hits ?? []) : entries.slice(podium ? 3 : 0)
  const standing = position.data
  const ownPosition = standing?.position ?? null
  const ownName = ownProfile.data?.fullName ?? account?.name
  const ownPicture =
    viewerId && ownProfile.data
      ? pictureSrc(ownProfile.data.picture, viewerId, ownName ?? '')
      : undefined

  const openCard = (entry: LeaderboardRowData) =>
    setCard({
      playerId: entry.id,
      name: entry.fullName,
      nickname: entry.nickname,
      picture: entry.pictureUrl,
      level: entry.levelHidden ? null : entry.playingLevel,
      isYou: entry.id === viewerId,
      masked: !!entry.masked,
      bannerKey: entry.bannerKey,
      bannerImageUrl: entry.bannerImageUrl,
    })

  const resetPages = (nextPeriod: LeaderboardPeriod) => {
    const key = leaderboardKeys.pages(nextPeriod, viewerId)
    client.setQueryData<InfiniteData<LeaderboardPageData>>(
      key,
      (old) => old && { pages: old.pages.slice(0, 1), pageParams: old.pageParams.slice(0, 1) },
      { updatedAt: client.getQueryState(key)?.dataUpdatedAt },
    )
  }
  const changePeriod = (next: LeaderboardPeriod) => {
    if (next === period) return
    setJumpTo(null)
    setFlashId(null)
    setOfflineRetry(false)
    resetPages(next)
    const url = new URL(window.location.href)
    url.searchParams.delete('player')
    if (next === 'year') url.searchParams.delete('period')
    else url.searchParams.set('period', next)
    window.history.replaceState(null, '', url)
  }
  const changeQuery = (value: string) => {
    setQuery(value)
    setJumpTo(null)
    setOfflineRetry(false)
    resetPages(period)
  }
  useEffect(() => {
    if (!flashId) return
    const timer = setTimeout(() => setFlashId(null), 1600)
    return () => clearTimeout(timer)
  }, [flashId])
  useEffect(() => {
    if (!jumpTo || nameSearch || loading || board.isFetching) return
    const row = document.getElementById(`leaderboard-${jumpTo}`)
    if (row) {
      row.scrollIntoView({
        block: 'center',
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      })
      row.focus({ preventScroll: true })
      // The row flashes on a jump from a profile.
      if (jumpTo !== viewerId || focusPlayerId === jumpTo) setFlashId(jumpTo)
      setJumpTo(null)
    } else if (board.hasNextPage && !failed && !board.isError) void board.fetchNextPage()
    else setJumpTo(null)
  }, [
    jumpTo,
    viewerId,
    focusPlayerId,
    nameSearch,
    loading,
    failed,
    board.hasNextPage,
    board.isFetching,
    board.isError,
    board.fetchNextPage,
  ])

  const savedAt = active.dataUpdatedAt
    ? new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(
        active.dataUpdatedAt,
      )
    : null
  const retry = () => {
    setOfflineRetry(dev.offline)
    void refresh()
  }
  const podiumEntries = entries.slice(0, 3).map((entry) => ({
    id: `leaderboard-${entry.id}`,
    fullName: entry.fullName,
    nickname: entry.nickname,
    wins: entry.wins,
    picture: { src: pictureSrc(entry.pictureUrl, entry.id, entry.fullName) },
    isMe: entry.id === viewerId,
    masked: entry.masked,
    disabled: !profileCardAvailable(entry),
  }))

  return (
    <PullToRefresh
      onRefresh={refreshing.refresh}
      throttled={!refreshing.canRefresh}
      offline={dev.offline}
      refreshing={refreshing.isRefreshing}
      updatedLabel={savedAt ?? undefined}
    >
      <main className="mx-auto flex max-w-[920px] flex-col gap-5 pr-[max(16px,env(safe-area-inset-right,0px))] pl-[max(16px,env(safe-area-inset-left,0px))] pt-5 pb-[120px]">
        <header className="flex flex-col gap-1.5">
          <PageHeader
            eyebrow="ROTRA leaderboards"
            className="[&>div>div:first-child]:text-xs [&>div>div:first-child]:font-semibold [&>div>div:first-child]:tracking-[0.6px] [&>div>div:first-child]:text-fg2 [&>div>div:first-child]:uppercase"
            title="Leaderboard"
            description={`The top 50 across every club. Most wins ${when} comes first. Singles and doubles count together.`}
          />
          <LeaderboardPeriodSwitch period={period} dateLabel={dateLabel} onChange={changePeriod} />
        </header>
        {podium ? (
          <TopThreePodium
            entries={podiumEntries as [PodiumEntry, PodiumEntry, PodiumEntry]}
            period={period}
            dateLabel={dateLabel}
            onSelect={(index) => {
              const entry = entries[index]
              if (entry && profileCardAvailable(entry)) openCard(entry)
            }}
          />
        ) : null}
        {viewerId && ownName && standing && !loading && !failed ? (
          <MyPositionCard
            fullName={ownName}
            picture={{ src: ownPicture }}
            period={period}
            position={
              ownPosition !== null && ownPosition <= LEADERBOARD_LIMIT ? ownPosition : undefined
            }
            wins={standing.wins}
            previousPosition={standing.previousPosition}
            cutoffWins={ownPosition !== null ? standing.cutoffWins : undefined}
            cutoffHasBetterWinRate={standing.cutoffHasBetterWinRate}
            onViewPicture={
              ownPicture ? () => photo.show({ src: ownPicture, name: ownName }) : undefined
            }
            onShowMyRow={() => {
              changeQuery('')
              setJumpTo(viewerId)
            }}
            onOpenProfile={() => router.push(`/players/${viewerId}`)}
          />
        ) : null}
        <Card className="flex flex-col gap-4">
          <LeaderboardSearch
            value={query}
            onChange={changeQuery}
            onFindId={(id) => router.push(`/find/${encodeURIComponent(id.trim().toUpperCase())}`)}
          />
          {dev.offline && active.data && savedAt && !failed ? (
            <Notice tone="warn">
              Saved copy from {savedAt}. Positions may have changed since then.
            </Notice>
          ) : null}
          {failed ? (
            <ErrorState
              title="Couldn't load the leaderboard."
              onRetry={retry}
              retrying={active.isFetching}
            >
              Check your connection, then try again.
            </ErrorState>
          ) : loading ? (
            <LeaderboardList loading period={period} />
          ) : empty ? (
            <div role="status">
              <EmptyState>
                No one on the leaderboard has played a standard match {when} yet.
              </EmptyState>
            </div>
          ) : nameSearch && search.data?.total === 0 ? (
            <div role="status">
              <EmptyState>No one in the top 50 matches “{query.trim()}”.</EmptyState>
            </div>
          ) : (
            <LeaderboardList
              period={period}
              busy={active.isFetching}
              search={
                nameSearch && search.data
                  ? { query: query.trim(), total: search.data.total }
                  : undefined
              }
              shown={nameSearch ? undefined : entries.length}
              total={nameSearch ? undefined : total}
              onShowMore={
                !nameSearch && board.hasNextPage
                  ? () => {
                      if (!board.isFetching) void board.fetchNextPage()
                    }
                  : undefined
              }
            >
              {shownEntries.map((entry) => (
                <LeaderboardRow
                  key={entry.id}
                  id={`leaderboard-${entry.id}`}
                  position={entry.position}
                  period={period}
                  wins={entry.wins}
                  previousPosition={entry.previousPosition}
                  masked={entry.masked}
                  unclaimed={entry.unclaimed}
                  fullName={entry.fullName}
                  nickname={entry.nickname}
                  picture={{ src: pictureSrc(entry.pictureUrl, entry.id, entry.fullName) }}
                  isMe={entry.id === viewerId}
                  flash={entry.id === flashId}
                  variant={entry.position <= 3 ? `medal-${entry.position as 1 | 2 | 3}` : undefined}
                  onSelect={profileCardAvailable(entry) ? () => openCard(entry) : undefined}
                />
              ))}
            </LeaderboardList>
          )}
          {dev.offline && active.data && !failed ? (
            <Button size="sm" className="self-start" onClick={retry}>
              Try again
            </Button>
          ) : null}
        </Card>
        <LeaderboardRulesCard onOpenRankDetail={() => router.push('/rank')} />
        {photo.viewerProps ? <PhotoViewer {...photo.viewerProps} /> : null}
        <ProfileCard person={card} onClose={() => setCard(null)} />
      </main>
    </PullToRefresh>
  )
}
