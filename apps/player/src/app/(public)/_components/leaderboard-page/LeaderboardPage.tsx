'use client'
import { leaderboardKeys } from '@rotra/data/leaderboard/query-keys'
import { useLeaderboard } from '@rotra/data/leaderboard/useLeaderboard'
import { useLeaderboardSearch } from '@rotra/data/leaderboard/useLeaderboardSearch'
import { useMyLeaderboardPosition } from '@rotra/data/leaderboard/useMyLeaderboardPosition'
import { rankDisplayStatus } from '@rotra/data/player/rules'
import { PLAYING_LEVELS } from '@rotra/data/player/types'
import { usePlayerProfile } from '@rotra/data/player/usePlayerProfile'
import { usePlayerRank } from '@rotra/data/player/usePlayerRank'
import { useRankingSettings } from '@rotra/data/ranking-settings'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { ErrorState } from '@rotra/ui/error-state'
import { LeaderboardList } from '@rotra/ui/leaderboard-list'
import { LeaderboardRow } from '@rotra/ui/leaderboard-row'
import { LeaderboardRulesCard } from '@rotra/ui/leaderboard-rules-card'
import { LeaderboardSearch } from '@rotra/ui/leaderboard-search'
import { MyPositionCard } from '@rotra/ui/my-position-card'
import { Notice } from '@rotra/ui/notice'
import { PageHeader } from '@rotra/ui/page-header'
import { type PodiumEntry, TopThreePodium } from '@rotra/ui/top-three-podium'
import { type InfiniteData, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { selectAccount } from '@/store/slices/authSlice'
import { selectDev } from '@/store/slices/devSlice'

function levelLabel(value: string) {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
export function LeaderboardPage() {
  const router = useRouter(),
    client = useQueryClient()
  const account = useAppSelector(selectAccount),
    dev = useAppSelector(selectDev)
  const [query, setQuery] = useState(''),
    [jumpToMe, setJumpToMe] = useState(false),
    [offlineRetry, setOfflineRetry] = useState(false)
  const board = useLeaderboard(),
    search = useLeaderboardSearch(query)
  const settings = useRankingSettings(),
    own = usePlayerRank(account?.id ?? '')
  const position = useMyLeaderboardPosition(account?.id)
  const ownProfile = usePlayerProfile(account?.id ?? '')
  const entries = board.data?.pages.flatMap((page) => page.entries) ?? []
  const total = board.data?.pages[0]?.total ?? 0
  const nameSearch = Boolean(query.trim()) && !/^RTR-/i.test(query.trim())
  const active = nameSearch ? search : board
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
  const changeQuery = (value: string) => {
    setQuery(value)
    setJumpToMe(false)
    setOfflineRetry(false)
    client.setQueryData<InfiniteData<NonNullable<typeof board.data>['pages'][number]>>(
      leaderboardKeys.pages(),
      (old) =>
        old ? { pages: old.pages.slice(0, 1), pageParams: old.pageParams.slice(0, 1) } : old,
      { updatedAt: client.getQueryState(leaderboardKeys.pages())?.dataUpdatedAt },
    )
  }
  useEffect(() => {
    if (!jumpToMe || !account || nameSearch) return
    const row = document.getElementById(`leaderboard-${account.id}`)
    if (row) {
      row.scrollIntoView({
        block: 'center',
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      })
      row.focus({ preventScroll: true })
      setJumpToMe(false)
    } else if (board.hasNextPage && !board.isFetching && !board.isError) void board.fetchNextPage()
    else if (!board.hasNextPage || board.isError) setJumpToMe(false)
  }, [
    jumpToMe,
    account,
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
    id: `leaderboard-${entry.id}`,
    fullName: entry.fullName,
    nickname: entry.nickname,
    levelLabel: levelLabel(entry.playingLevel),
    picture: { src: entry.pictureUrl ?? undefined },
    isMe: entry.id === account?.id,
  }))
  return (
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
            if (entry) openProfile(entry.id)
          }}
        />
      ) : null}
      {account && own.data && requirement !== undefined ? (
        <MyPositionCard
          fullName={own.data.fullName}
          picture={{ src: ownProfile.data?.picture ?? undefined }}
          levelLabel={
            own.data.levelIndex === null
              ? undefined
              : levelLabel(PLAYING_LEVELS[own.data.levelIndex] ?? '')
          }
          position={own.data.position === null ? undefined : (position.data ?? own.data.position)}
          onShowMyRow={() => {
            setQuery('')
            setJumpToMe(true)
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
            No players qualify for the leaderboard yet. Players appear after {requirement} standard
            matches in the last three months.
          </p>
        ) : nameSearch && search.data?.total === 0 ? (
          <p className="py-5 text-center text-sm text-fg2" aria-live="polite">
            No one on the leaderboard matches “{query.trim()}”. Players below the match requirement
            aren't listed here.
          </p>
        ) : (
          <>
            {nameSearch && search.data ? (
              <p className="text-sm text-fg2" aria-live="polite">
                {search.data.total} {search.data.total === 1 ? 'player matches' : 'players match'} “
                {query.trim()}”.{search.data.total > 50 ? ' Showing the first 50.' : ''}
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
                  fullName={entry.fullName}
                  nickname={entry.nickname}
                  picture={{ src: entry.pictureUrl ?? undefined }}
                  levelLabel={levelLabel(entry.playingLevel)}
                  isMe={entry.id === account?.id}
                  variant={entry.position <= 3 ? `medal-${entry.position as 1 | 2 | 3}` : undefined}
                  onSelect={() => openProfile(entry.id)}
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
    </main>
  )
}
