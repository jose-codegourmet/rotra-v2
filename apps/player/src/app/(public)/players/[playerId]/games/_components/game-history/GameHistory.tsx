'use client'
import { usePlayerGames } from '@rotra/data/player/usePlayerGames'
import { usePlayerRank } from '@rotra/data/player/usePlayerRank'
import { ErrorState } from '@rotra/ui/error-state'
import { Notice } from '@rotra/ui/notice'
import { Button } from '@rotra/ui/button'
import { MatchHistory } from '@rotra/ui/match-history'
import { PageHeader } from '@rotra/ui/page-header'
import { ProfileNotFound } from '@rotra/ui/profile-not-found'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { selectAccount } from '@/store/slices/authSlice'
import { selectDev } from '@/store/slices/devSlice'
import Loading from '../../loading'
export function GameHistory({ playerId }: { playerId: string }) {
  const rank = usePlayerRank(playerId), games = usePlayerGames(playerId), router = useRouter()
  const [activeTab, setActiveTab] = useState<'counted' | 'other'>('counted')
  const player = rank.data
  const account = useAppSelector(selectAccount), { offline } = useAppSelector(selectDev)
  if (rank.data === null) return <main className="mx-auto max-w-[920px] px-4 pt-5"><ProfileNotFound id={playerId} /></main>
  if ((rank.isError || games.isError) && (!player || !games.data || !offline)) return <main className="mx-auto max-w-[920px] px-4 pt-5"><ErrorState title="Couldn't load game history." retryLabel="Retry" retrying={rank.isFetching || games.isFetching} onRetry={() => { void rank.refetch(); void games.refetch() }}>Check your connection, then try again.</ErrorState></main>
  if (!player || !games.data) return <Loading />
  const notices: string[] = []
  if (player.state === 'needs_reassessment') notices.push('None of these games are from the last three months, so they no longer count toward the leaderboard.')
  if (player.updatePending) notices.push(`${player.updatePending.sessionTitle} games are in, but the rank update from them is still processing.`)
  return <main className="mx-auto flex max-w-[920px] flex-col gap-5 px-4 pt-5 pb-[120px]">
    <Button variant="ghost" size="sm" className="self-start" onClick={() => router.push(`/players/${playerId}`)}>← {player.fullName}</Button>
    <PageHeader eyebrow={player.fullName} title="Games" description="Official results from finished club sessions. Results are final and can't be edited." />
    {offline && account?.id === playerId ? <Notice tone="warn">Saved copy. Your rank and games may have changed since this device was last online.</Notice> : null}
    <MatchHistory sessions={games.data} activeTab={activeTab} onTabChange={setActiveTab} notices={notices} />
  </main>
}
