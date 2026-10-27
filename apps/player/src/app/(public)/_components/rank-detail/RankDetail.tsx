'use client'
import { PLAYING_LEVELS } from '@rotra/data/player/types'
import { usePlayerRank } from '@rotra/data/player/usePlayerRank'
import { useRankingSettings } from '@rotra/data/ranking-settings'
import { ErrorState } from '@rotra/ui/error-state'
import { Notice } from '@rotra/ui/notice'
import { Button } from '@rotra/ui/button'
import { PageHeader } from '@rotra/ui/page-header'
import { ProfileNotFound } from '@rotra/ui/profile-not-found'
import { RankExplanation } from '@rotra/ui/rank-explanation'
import { useRouter } from 'next/navigation'
import { useAppSelector } from '@/store/hooks'
import { selectAccount } from '@/store/slices/authSlice'
import { selectDev } from '@/store/slices/devSlice'
import Loading from '../../rank/loading'
export function RankDetail({ playerId }: { playerId?: string }) {
  const settings = useRankingSettings(), rank = usePlayerRank(playerId ?? '')
  const router = useRouter(), player = rank.data
  const account = useAppSelector(selectAccount), { offline } = useAppSelector(selectDev)
  if (playerId && rank.data === null) return <main className="mx-auto max-w-[920px] px-4 pt-5"><ProfileNotFound id={playerId} /></main>
  if ((rank.isError && playerId && (!player || !offline)) || (settings.isError && !settings.data)) return <main className="mx-auto max-w-[920px] px-4 pt-5"><ErrorState title="Couldn't load rank details." retryLabel="Retry" retrying={rank.isFetching || settings.isFetching} onRetry={() => { if (playerId) void rank.refetch(); void settings.refetch() }}>Check your connection, then try again.</ErrorState></main>
  if (!settings.data || (playerId && !player)) return <Loading />
  const firstName = player?.nickname || player?.fullName.split(' ')[0] || ''
  const possessive = firstName.endsWith('s') ? `${firstName}’` : `${firstName}’s`
  const level = player?.levelIndex == null ? null : PLAYING_LEVELS[player.levelIndex]
  const levelLabel = level ? level.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : 'Not calculated'
  return <main className="mx-auto flex max-w-[920px] flex-col gap-5 px-4 pt-5 pb-[120px]">
    <Button variant="ghost" size="sm" className="self-start" onClick={() => router.push(playerId ? `/players/${playerId}` : '/')}>← {player?.fullName ?? 'Leaderboard'}</Button>
    <PageHeader eyebrow="Shared rank" title={player ? `How ${possessive} rank works` : 'How a rank works'} description="One rank follows a player across clubs and covers both singles and doubles. It mixes what clubs judge with how matches go." />
    {offline && player && account?.id === playerId ? <Notice tone="warn">Saved copy. Your rank and games may have changed since this device was last online.</Notice> : null}
    <RankExplanation assessmentWeightPercent={settings.data.assessmentWeightPercent} player={player ? { firstName, levelIndex: player.levelIndex, stale: player.state === 'needs_reassessment', levelLabel } : undefined} />
  </main>
}
