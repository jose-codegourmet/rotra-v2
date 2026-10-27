'use client'
import { PLAYING_LEVELS } from '@rotra/data/player/types'
import { usePlayerRank } from '@rotra/data/player/usePlayerRank'
import { useRankingSettings } from '@rotra/data/ranking-settings'
import { Button } from '@rotra/ui/button'
import { PageHeader } from '@rotra/ui/page-header'
import { ProfileNotFound } from '@rotra/ui/profile-not-found'
import { RankExplanation } from '@rotra/ui/rank-explanation'
import { useRouter } from 'next/navigation'
export function RankDetail({ playerId }: { playerId?: string }) {
  const settings = useRankingSettings(), rank = usePlayerRank(playerId ?? '')
  const router = useRouter(), player = rank.data
  if (playerId && rank.isSuccess && !player) return <ProfileNotFound id={playerId} />
  if (!settings.data || (playerId && !player)) return null
  const firstName = player?.nickname || player?.fullName.split(' ')[0] || ''
  const possessive = firstName.endsWith('s') ? `${firstName}’` : `${firstName}’s`
  const level = player?.levelIndex == null ? null : PLAYING_LEVELS[player.levelIndex]
  const levelLabel = level ? level.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : 'Not calculated'
  return <main className="mx-auto flex max-w-[920px] flex-col gap-5 px-4 pt-5 pb-[120px]">
    <Button variant="ghost" size="sm" className="self-start" onClick={() => router.push(playerId ? `/players/${playerId}` : '/')}>← {player?.fullName ?? 'Leaderboard'}</Button>
    <PageHeader eyebrow="Shared rank" title={player ? `How ${possessive} rank works` : 'How a rank works'} description="One rank follows a player across clubs and covers both singles and doubles. It mixes what clubs judge with how matches go." />
    <RankExplanation assessmentWeightPercent={settings.data.assessmentWeightPercent} player={player ? { firstName, levelIndex: player.levelIndex, stale: player.state === 'needs_reassessment', levelLabel } : undefined} />
  </main>
}
