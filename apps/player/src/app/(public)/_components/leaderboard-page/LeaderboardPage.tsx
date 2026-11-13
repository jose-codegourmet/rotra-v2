'use client'
import { leaderboardKeys } from '@rotra/data/leaderboard/query-keys'
import { useLeaderboard } from '@rotra/data/leaderboard/useLeaderboard'
import { useLeaderboardSearch } from '@rotra/data/leaderboard/useLeaderboardSearch'
import { useMyLeaderboardPosition } from '@rotra/data/leaderboard/useMyLeaderboardPosition'
import { rankDisplayStatus } from '@rotra/data/player/rules'
import { PLAYING_LEVELS, type PlayingLevel } from '@rotra/data/player/types'
import { usePlayerProfile } from '@rotra/data/player/usePlayerProfile'
import { usePlayerRank } from '@rotra/data/player/usePlayerRank'
import { useRankingSettings } from '@rotra/data/ranking-settings'
import { useThrottledRefresh } from '@rotra/data/refresh/useThrottledRefresh'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { ErrorState } from '@rotra/ui/error-state'
import { usePhotoViewer } from '@rotra/ui/hooks/use-photo-viewer'
import { LeaderboardList } from '@rotra/ui/leaderboard-list'
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
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ProfileCard, type ProfileCardPerson } from '@/app/_components/profile-card/ProfileCard'
import { pictureSrc } from '@/app/_components/profile-picture/pictureSrc'
import { useAppSelector } from '@/store/hooks'
import { selectAccount } from '@/store/slices/authSlice'
import { selectDev } from '@/store/slices/devSlice'

function levelLabel(value: string) {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
/**
 * `focusPlayerId` (`/?player=<id>`, the profile's Overall box; 2026-11-13-player-ranking-card): the
 * list loads pages until that row is there, scrolls it to the middle and flashes it.
 */
export function LeaderboardPage({ focusPlayerId }: { focusPlayerId?: string } = {}) {
  const router = useRouter(),
    client = useQueryClient()
  const account = useAppSelector(selectAccount),
    dev = useAppSelector(selectDev)
  const [query, setQuery] = useState(''),
    [jumpTo, setJumpTo] = useState<string | null>(focusPlayerId ?? null),
    [flashId, setFlashId] = useState<string | null>(null),
    [offlineRetry, setOfflineRetry] = useState(false)
  const board = useLeaderboard(),
    search = useLeaderboardSearch(query)
  const settings = useRankingSettings(),
    own = usePlayerRank(account?.id ?? '')
  const position = useMyLeaderboardPosition(account?.id)
  const ownProfile = usePlayerProfile(account?.id ?? '')
  const photo = usePhotoViewer()
  // Artifact comment, 2026-11-13: a podium spot or a row opens the profile card first.
  const [card, setCard] = useState<ProfileCardPerson | null>(null)
  const entries = board.data?.pages.flatMap((page) => page.entries) ?? []
  const total = board.data?.pages[0]?.total ?? 0
  const nameSearch = Boolean(query.trim()) && !/^RTR-/i.test(query.trim())
  const active = nameSearch ? search : board
  // Pull down (or come back to the tab) to refresh the list, once every 10 seconds (mockup change 2026-11-12).
  const refreshing = useThrottledRefresh(
    () => Promise.all([active.refetch(), position.refetch(), settings.refetch()]),
    { refreshOnReturn: true },
  )
  const loading =
    dev.leaderboardScenario === 'loading' ||
    (active.isPending && !active.data) ||
    (settings.isPending && !settings.data)
  const failed =
    (settings.isError && !settings.data) ||
    dev.leaderboardScenario === 'error' ||
    (active.isError && (!active.data || (dev.offline && offlineRetry)))
  const empty = !loading && !failed && board.data && total === 0
  const podium = !loading && !failed && !empty && !nameSearch && total >= 3 && entries.length >= 3
  const shownEntries = nameSearch ? (search.data?.hits ?? []) : entries.slice(podium ? 3 : 0)
  const openProfile = (id: string) => router.push(`/players/${id}`)
  const openCard = (entry: {
    id: string
    fullName: string
    nickname: string | null
    pictureUrl: string | null
    playingLevel: PlayingLevel
    masked?: boolean
    levelHidden?: boolean
  }) =>
    setCard({
      playerId: entry.id,
      name: entry.fullName,
      nickname: entry.nickname,
      picture: entry.pictureUrl,
      level: entry.levelHidden ? null : entry.playingLevel,
      isYou: entry.id === account?.id,
      masked: !!entry.masked,
    })
  const changeQuery = (value: string) => {
    setQuery(value)
    setJumpTo(null)
    setOfflineRetry(false)
    client.setQueryData<InfiniteData<NonNullable<typeof board.data>['pages'][number]>>(
      leaderboardKeys.pages(),
      (old) =>
        old ? { pages: old.pages.slice(0, 1), pageParams: old.pageParams.slice(0, 1) } : old,
      { updatedAt: client.getQueryState(leaderboardKeys.pages())?.dataUpdatedAt },
    )
  }
  useEffect(() => {
    if (!flashId) return
    const timer = setTimeout(() => setFlashId(null), 1600)
    return () => clearTimeout(timer)
  }, [flashId])
  useEffect(() => {
    if (!jumpTo || nameSearch) return
    const row = document.getElementById(`leaderboard-${jumpTo}`)
    if (row) {
      row.scrollIntoView({
        block: 'center',
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      })
      row.focus({ preventScroll: true })
      // A jump from a profile flashes the row (the prototype's seeOnBoard).
      if (jumpTo !== account?.id || focusPlayerId === jumpTo) setFlashId(jumpTo)
      setJumpTo(null)
    } else if (board.hasNextPage && !board.isFetching && !board.isError) void board.fetchNextPage()
    else if (!board.hasNextPage || board.isError) setJumpTo(null)
  }, [
    jumpTo,
    account,
    focusPlayerId,
    nameSearch,
    board.hasNextPage,
    board.isFetching,
    board.isError,
    board.fetchNextPage,
  ])
  const ownRank = own.data
  const requirement = settings.data?.matchRequirement
  const ownStatus =
    ownRank && requirement !== undefined
      ? rankDisplayStatus({
          level: ownRank.levelIndex,
          state: ownRank.state,
          updatePending: ownRank.updatePending,
          position: ownRank.position,
          recentCount: ownRank.recentCount,
          matchRequirement: requirement,
        })
      : null
  const notListedStatus =
    ownRank && ownStatus
      ? {
          label:
            ownStatus === 'not-calculated'
              ? 'Not calculated'
              : ownStatus === 'needs-reassessment'
                ? 'Needs reassessment'
                : ownStatus === 'qualifies'
                  ? 'Qualifies'
                  : 'Provisional',
          tone:
            ownStatus === 'needs-reassessment'
              ? ('warn' as const)
              : ownStatus === 'qualifies'
                ? ('accent' as const)
                : ('neutral' as const),
          needsReassessment: ownStatus === 'needs-reassessment',
          sentence:
            ownStatus === 'not-calculated'
              ? 'ROTRA calculates a rank once a club has assessed you and a session with that assessment is done. Until then there is no rank to show.'
              : ownStatus === 'needs-reassessment'
                ? `Last played more than three months ago, so this rank is out of date and not on the leaderboard. To return, a club gives you a fresh assessment and you play ${requirement} standard matches within three months.`
                : ownStatus === 'qualifies'
                  ? 'You now have enough recent matches. The position appears after the next leaderboard update.'
                  : `No overall position yet. ${ownRank.recentCount} of ${requirement} standard matches in the last three months.`,
        }
      : undefined
  const retry = () => {
    setOfflineRetry(dev.offline)
    void active.refetch()
    if (!settings.data) void settings.refetch()
  }
  const savedAt = active.dataUpdatedAt
    ? new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(
        active.dataUpdatedAt,
      )
    : null
  const podiumEntries = entries.slice(0, 3).map((entry) => ({
    masked: 'masked' in entry && !!entry.masked,
    id: `leaderboard-${entry.id}`,
    fullName: entry.fullName,
    nickname: entry.nickname,
    levelLabel: 'levelHidden' in entry && entry.levelHidden ? '' : levelLabel(entry.playingLevel),
    picture: { src: pictureSrc(entry.pictureUrl, entry.id, entry.fullName) },
    isMe: entry.id === account?.id,
  }))
  return (
    <PullToRefresh
      onRefresh={refreshing.refresh}
      throttled={!refreshing.canRefresh}
      offline={dev.offline}
      refreshing={refreshing.isRefreshing}
      updatedLabel={savedAt ?? undefined}
    >
      <main className="mx-auto flex max-w-[920px] flex-col gap-5 px-[max(16px,env(safe-area-inset-left,0px))] pt-5 pb-[120px]">
        <PageHeader
          eyebrow="Overall ROTRA ranking"
          className="[&>div>div:first-child]:text-xs [&>div>div:first-child]:font-semibold [&>div>div:first-child]:tracking-[0.6px] [&>div>div:first-child]:text-fg2 [&>div>div:first-child]:uppercase"
          title="Leaderboard"
          description="One list across every club. Singles and doubles share one rank."
        />
        {podium ? (
          <TopThreePodium
            entries={podiumEntries as [PodiumEntry, PodiumEntry, PodiumEntry]}
            totalPlayers={total}
            onSelect={(i) => {
              const entry = entries[i]
              if (entry) openCard(entry)
            }}
          />
        ) : null}
        {account && own.data && requirement !== undefined ? (
          <MyPositionCard
            fullName={own.data.fullName}
            picture={{
              src: ownProfile.data
                ? pictureSrc(ownProfile.data.picture, account.id, ownProfile.data.fullName)
                : undefined,
            }}
            levelLabel={
              own.data.levelIndex === null
                ? undefined
                : levelLabel(PLAYING_LEVELS[own.data.levelIndex] ?? '')
            }
            position={own.data.position === null ? undefined : (position.data ?? own.data.position)}
            onViewPicture={(() => {
              const src = ownProfile.data
                ? pictureSrc(ownProfile.data.picture, account.id, ownProfile.data.fullName)
                : undefined
              return src
                ? () =>
                    photo.show({
                      src,
                      name: own.data?.fullName ?? ownProfile.data?.fullName ?? 'You',
                    })
                : undefined
            })()}
            onShowMyRow={() => {
              setQuery('')
              if (account) setJumpTo(account.id)
            }}
            onOpenProfile={() => openProfile(account.id)}
            status={notListedStatus}
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
            <LeaderboardList loading />
          ) : empty ? (
            <p className="py-5 text-center text-sm text-fg2" role="status">
              No players qualify for the leaderboard yet. Players appear after {requirement}{' '}
              standard matches in the last three months.
            </p>
          ) : nameSearch && search.data?.total === 0 ? (
            <p className="py-5 text-center text-sm text-fg2" aria-live="polite">
              No one on the leaderboard matches “{query.trim()}”. Players below the match
              requirement aren't listed here.
            </p>
          ) : (
            <>
              {nameSearch && search.data ? (
                <p className="text-sm text-fg2" aria-live="polite">
                  {search.data.total} {search.data.total === 1 ? 'player matches' : 'players match'}{' '}
                  “{query.trim()}”.{search.data.total > 50 ? ' Showing the first 50.' : ''}
                </p>
              ) : null}
              <LeaderboardList
                busy={active.isFetching}
                shown={nameSearch ? undefined : entries.length}
                total={nameSearch ? undefined : total}
                onShowMore={
                  board.hasNextPage
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
                    masked={'masked' in entry && !!entry.masked}
                    fullName={entry.fullName}
                    nickname={entry.nickname}
                    picture={{ src: pictureSrc(entry.pictureUrl, entry.id, entry.fullName) }}
                    levelLabel={
                      'levelHidden' in entry && entry.levelHidden
                        ? ''
                        : levelLabel(entry.playingLevel)
                    }
                    isMe={entry.id === account?.id}
                    flash={entry.id === flashId}
                    variant={
                      entry.position <= 3 ? `medal-${entry.position as 1 | 2 | 3}` : undefined
                    }
                    onSelect={() => openCard(entry)}
                  />
                ))}
              </LeaderboardList>
            </>
          )}
          {dev.offline && active.data && !failed ? (
            <Button size="sm" className="self-start" onClick={retry}>
              Try again
            </Button>
          ) : null}
        </Card>
        {settings.data ? (
          <LeaderboardRulesCard
            matchRequirement={settings.data.matchRequirement}
            onOpenRankDetail={() => router.push('/rank')}
          />
        ) : null}
        {photo.viewerProps ? <PhotoViewer {...photo.viewerProps} /> : null}
        <ProfileCard person={card} onClose={() => setCard(null)} />
      </main>
    </PullToRefresh>
  )
}
