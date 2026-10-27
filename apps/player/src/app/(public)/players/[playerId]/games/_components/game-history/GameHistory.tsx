'use client'
import { usePlayerGames } from '@rotra/data/player/usePlayerGames'
import { usePlayerRank } from '@rotra/data/player/usePlayerRank'
import { Button } from '@rotra/ui/button'
import { MatchHistory } from '@rotra/ui/match-history'
import { PageHeader } from '@rotra/ui/page-header'
import { ProfileNotFound } from '@rotra/ui/profile-not-found'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
export function GameHistory({ playerId }: { playerId: string }) {
  const rank = usePlayerRank(playerId), games = usePlayerGames(playerId), router = useRouter()
  const [activeTab, setActiveTab] = useState<'counted' | 'other'>('counted')
  const player = rank.data
  if (rank.isSuccess && !player) return <ProfileNotFound id={playerId} />
  if (!player || !games.data) return null
  const notices: string[] = []
  if (player.state === 'needs_reassessment') notices.push('None of these games are from the last three months, so they no longer count toward the leaderboard.')
  if (player.updatePending) notices.push(`${player.updatePending.sessionTitle} games are in, but the rank update from them is still processing.`)
  return <main className="mx-auto flex max-w-[920px] flex-col gap-5 px-4 pt-5 pb-[120px]">
    <Button variant="ghost" size="sm" className="self-start" onClick={() => router.push(`/players/${playerId}`)}>← {player.fullName}</Button>
    <PageHeader eyebrow={player.fullName} title="Games" description="Official results from finished club sessions. Results are final and can't be edited." />
    <MatchHistory sessions={games.data} activeTab={activeTab} onTabChange={setActiveTab} notices={notices} />
  </main>
}
