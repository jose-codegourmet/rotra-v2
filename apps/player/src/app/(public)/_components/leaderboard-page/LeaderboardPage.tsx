'use client'
import { leaderboardKeys } from '@rotra/data/leaderboard/query-keys'
import { useLeaderboard } from '@rotra/data/leaderboard/useLeaderboard'
import { useLeaderboardSearch } from '@rotra/data/leaderboard/useLeaderboardSearch'
import { useMyLeaderboardPosition } from '@rotra/data/leaderboard/useMyLeaderboardPosition'
import { usePlayerRank } from '@rotra/data/player/usePlayerRank'
import { PLAYING_LEVELS } from '@rotra/data/player/types'
import { useRankingSettings } from '@rotra/data/ranking-settings'
import { Card } from '@rotra/ui/card'
import { LeaderboardList } from '@rotra/ui/leaderboard-list'
import { LeaderboardRow } from '@rotra/ui/leaderboard-row'
import { LeaderboardRulesCard } from '@rotra/ui/leaderboard-rules-card'
import { LeaderboardSearch } from '@rotra/ui/leaderboard-search'
import { MyPositionCard } from '@rotra/ui/my-position-card'
import { PageHeader } from '@rotra/ui/page-header'
import { TopThreePodium, type PodiumEntry } from '@rotra/ui/top-three-podium'
import { useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { selectAccount } from '@/store/slices/authSlice'

function levelLabel(value: string) { return value.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') }
export function LeaderboardPage() {
  const router = useRouter(), client = useQueryClient()
  const account = useAppSelector(selectAccount)
  const [query, setQuery] = useState(''), [jumpToMe, setJumpToMe] = useState(false)
  const board = useLeaderboard(), search = useLeaderboardSearch(query)
  const settings = useRankingSettings(), own = usePlayerRank(account?.id ?? '')
  const position = useMyLeaderboardPosition(account?.id)
  const entries = board.data?.pages.flatMap((page) => page.entries) ?? []
  const total = board.data?.pages[0]?.total ?? 0
  const nameSearch = Boolean(query.trim()) && !/^RTR-/i.test(query.trim())
  const podium = !nameSearch && total >= 3 && entries.length >= 3
  const shownEntries = nameSearch ? search.data?.hits ?? [] : entries.slice(podium ? 3 : 0)
  const openProfile = (id: string) => router.push(`/players/${id}`)
  const changeQuery = (value: string) => {
    setQuery(value); setJumpToMe(false)
    client.setQueryData<InfiniteData<NonNullable<typeof board.data>['pages'][number]>>(leaderboardKeys.pages(), (old) => old ? { pages: old.pages.slice(0, 1), pageParams: old.pageParams.slice(0, 1) } : old)
  }
  useEffect(() => {
    if (!jumpToMe || !account || nameSearch) return
    const row = document.getElementById(`leaderboard-${account.id}`)
    if (row) {
      row.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
      row.focus({ preventScroll: true }); setJumpToMe(false)
    } else if (board.hasNextPage && !board.isFetching && !board.isError) void board.fetchNextPage()
    else if (!board.hasNextPage || board.isError) setJumpToMe(false)
  }, [jumpToMe, account, nameSearch, board.data, board.hasNextPage, board.isFetching, board.isError, board.fetchNextPage])
  const podiumEntries = entries.slice(0, 3).map((entry) => ({ id: `leaderboard-${entry.id}`, fullName: entry.fullName, nickname: entry.nickname, levelLabel: levelLabel(entry.playingLevel), isMe: entry.id === account?.id }))
  return (
    <main className="mx-auto flex max-w-[920px] flex-col gap-5 px-[max(16px,env(safe-area-inset-left,0px))] pt-5 pb-[120px]">
      <PageHeader eyebrow="Overall ROTRA ranking" title="Leaderboard" description="One list across every club. Singles and doubles share one rank." />
      {podium ? <TopThreePodium entries={podiumEntries as [PodiumEntry, PodiumEntry, PodiumEntry]} totalPlayers={total} onSelect={(i) => { const entry = entries[i]; if (entry) openProfile(entry.id) }} /> : null}
      {account && own.data ? <MyPositionCard fullName={own.data.fullName} levelLabel={own.data.levelIndex === null ? undefined : levelLabel(PLAYING_LEVELS[own.data.levelIndex] ?? '')} position={position.data ?? undefined} onShowMyRow={() => { setQuery(''); setJumpToMe(true) }} onOpenProfile={() => openProfile(account.id)} status={{ label: 'Provisional', tone: 'neutral', sentence: `No overall position yet. ${own.data.recentCount} of ${settings.data?.matchRequirement ?? 10} standard matches in the last three months.` }} /> : null}
      <Card className="flex flex-col gap-4">
        <LeaderboardSearch value={query} onChange={changeQuery} onFindId={(id) => router.push(`/find/${encodeURIComponent(id.trim().toUpperCase())}`)} />
        {nameSearch && search.data ? <p className="text-sm text-fg2" aria-live="polite">{search.data.total} {search.data.total === 1 ? 'player matches' : 'players match'} “{query.trim()}”.{search.data.total > 50 ? ' Showing the first 50.' : ''}</p> : null}
        <LeaderboardList shown={nameSearch ? undefined : entries.length} total={nameSearch ? undefined : total} onShowMore={board.hasNextPage ? () => { if (!board.isFetching) void board.fetchNextPage() } : undefined}>
          {shownEntries.map((entry) => <LeaderboardRow key={entry.id} id={`leaderboard-${entry.id}`} position={entry.position} fullName={entry.fullName} nickname={entry.nickname} levelLabel={levelLabel(entry.playingLevel)} isMe={entry.id === account?.id} variant={entry.position <= 3 ? `medal-${entry.position as 1 | 2 | 3}` : undefined} onSelect={() => openProfile(entry.id)} />)}
        </LeaderboardList>
      </Card>
      {settings.data ? <LeaderboardRulesCard matchRequirement={settings.data.matchRequirement} onOpenRankDetail={() => router.push('/rank')} /> : null}
    </main>
  )
}
