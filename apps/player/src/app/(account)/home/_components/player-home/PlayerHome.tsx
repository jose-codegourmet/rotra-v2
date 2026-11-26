'use client'
import { useSession } from '@rotra/data/auth/use-session'
import { manilaYear, weeklyPerformance } from '@rotra/data/player/rules'
import { PLAYING_LEVELS } from '@rotra/data/player/types'
import { useMySessions } from '@rotra/data/player/useMySessions'
import { usePlayerGames } from '@rotra/data/player/usePlayerGames'
import { usePlayerProfile } from '@rotra/data/player/usePlayerProfile'
import { usePlayerRank } from '@rotra/data/player/usePlayerRank'
import { usePlayerClubs } from '@rotra/data/player-club/usePlayerClubs'
import { useRankingSettings } from '@rotra/data/ranking-settings'
import { Card } from '@rotra/ui/card'
import { CurrentSessionCard } from '@rotra/ui/current-session-card'
import { ErrorState } from '@rotra/ui/error-state'
import { levelLabel } from '@rotra/ui/level-pill'
import { MySessionsCard } from '@rotra/ui/my-sessions-card'
import { Notice } from '@rotra/ui/notice'
import { PlayerClubsCard } from '@rotra/ui/player-clubs-card'
import { ProfileRankingCard } from '@rotra/ui/profile-ranking-card'
import { Skeleton } from '@rotra/ui/skeleton'
import {
  WeeklyPerformanceChart,
  type WeeklyVisibility,
  WeeklyVisibilityChip,
} from '@rotra/ui/weekly-performance-chart'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ClubCard } from '@/app/_components/club-card/ClubCard'
import { rankStatusFor } from '@/app/_components/rank-status/rankStatus'
import { usePlayerShareSheet } from '@/app/_components/share/usePlayerShareSheet'
import { useAppSelector } from '@/store/hooks'
import { selectAccount } from '@/store/slices/authSlice'
import { selectDev } from '@/store/slices/devSlice'
import Loading from '../../loading'

const OFFLINE_COPY =
  'Saved copy. Your sessions, rank and games may have changed since this device was last online.'

/**
 * P-HOME: Hi NAME, the Current session, then Upcoming sessions and Your clubs (left) beside Your stats
 * (right). Existing hooks only; every visual piece is a @rotra/ui card.
 */
export function PlayerHome() {
  const router = useRouter()
  const session = useSession('player')
  const account = useAppSelector(selectAccount)
  const { offline } = useAppSelector(selectDev)
  const playerId = session.data?.account.id ?? account?.id ?? ''
  const signedOut = !session.isPending && !session.data && !account
  const profile = usePlayerProfile(playerId),
    rank = usePlayerRank(playerId),
    games = usePlayerGames(playerId),
    settings = useRankingSettings(),
    mySessions = useMySessions(playerId || null),
    clubs = usePlayerClubs(playerId || null)
  const [clubCard, setClubCard] = useState<string | null>(null)
  const sharing = usePlayerShareSheet(playerId || null)
  // Signed out: back to sign in, returning here. proxy.ts does this first; this covers mock mode.
  useEffect(() => {
    if (signedOut) router.replace(`/login?returnTo=${encodeURIComponent('/home')}`)
  }, [signedOut, router])
  if (signedOut || (session.isPending && !account) || profile.isPending) return <Loading />
  const player = profile.data
  if (profile.isError || !player) {
    return (
      <main className="mx-auto max-w-[920px] px-4 pt-5">
        <ErrorState title="Couldn't load Home." onRetry={() => void profile.refetch()}>
          Check your connection, then try again.
        </ErrorState>
      </main>
    )
  }
  const name = player.nickname || player.fullName.split(' ')[0] || player.fullName
  const live = mySessions.data?.sessions.find((entry) => entry.status === 'live')
  const upcoming = (mySessions.data?.sessions ?? []).filter((entry) => entry.status !== 'live')
  const current = rank.data,
    requirement = settings.data?.matchRequirement
  const levelCode =
    current?.levelIndex == null ? null : (PLAYING_LEVELS[current.levelIndex] ?? null)
  const { status, rankText } =
    current && requirement !== undefined
      ? rankStatusFor(current, requirement, 'you')
      : { status: undefined, rankText: undefined }
  const now = Date.now()
  const year = manilaYear(now)
  const weeklyVisibility: WeeklyVisibility =
    player.showWeeklyPerformance === false
      ? 'hidden'
      : player.profileVisibility === 'always_private'
        ? 'only-you'
        : player.profileVisibility === 'private'
          ? 'signed-in'
          : 'public'
  return (
    <main className="mx-auto max-w-[1240px] px-[max(16px,env(safe-area-inset-left,0px))] pt-5 pr-[max(16px,env(safe-area-inset-right,0px))] pb-[120px]">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h1>Hi, {name}</h1>
          <span className="text-fg2">Your sessions, clubs and stats.</span>
        </div>
        {offline ? <Notice tone="warn">{OFFLINE_COPY}</Notice> : null}
        {mySessions.isPending ? (
          <Skeleton className="h-28" />
        ) : mySessions.isError ? (
          <ErrorState
            title="Couldn't load your sessions."
            onRetry={() => void mySessions.refetch()}
          />
        ) : (
          <CurrentSessionCard
            session={
              live ? { title: live.title, subtitle: live.subtitle, href: live.href } : undefined
            }
            linkAs={Link}
          />
        )}
        <div className="grid grid-cols-1 items-start gap-5 min-[900px]:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-5">
            {mySessions.isPending ? (
              <Skeleton className="h-40" />
            ) : mySessions.isError ? null : (
              <MySessionsCard
                sessions={upcoming}
                finished={mySessions.data?.finished}
                onShareResult={sharing.openResult}
              />
            )}
            {clubs.isPending ? (
              <Skeleton className="h-36" />
            ) : clubs.isError ? (
              <ErrorState title="Couldn't load your clubs." onRetry={() => void clubs.refetch()} />
            ) : (
              <PlayerClubsCard
                isOwn
                onOpenClub={setClubCard}
                clubs={(clubs.data ?? []).map((club) => ({
                  ...club,
                  clubPageHref: `/clubs/${encodeURIComponent(club.id)}`,
                }))}
              />
            )}
          </div>
          <div className="flex min-w-0 flex-col gap-5">
            <span className="-mb-2 text-xs font-semibold text-fg2 uppercase">Your stats</span>
            {current && games.data ? (
              <>
                <ProfileRankingCard
                  levelLabel={levelCode ? levelLabel(levelCode) : null}
                  status={status}
                  rankText={rankText}
                  onShare={current.levelIndex !== null ? sharing.openRank : undefined}
                  onOpenRankDetail={() => router.push(`/players/${playerId}/rank`)}
                  leaderboardPlaces={player.leaderboardPlaces ?? []}
                  onOpenLeaderboard={(period) =>
                    router.push(`/?period=${period}&player=${encodeURIComponent(playerId)}`)
                  }
                />
                <WeeklyPerformanceChart
                  readOnly
                  days={weeklyPerformance(games.data, year)}
                  year={year}
                  onSeeAllGames={() => router.push(`/players/${playerId}/games`)}
                  visibility={
                    <WeeklyVisibilityChip
                      visibility={weeklyVisibility}
                      onOpenSetting={() =>
                        router.push('/profile/privacy-and-contact?highlight=weekly')
                      }
                    />
                  }
                />
              </>
            ) : rank.isError || games.isError ? (
              <ErrorState
                title="Couldn't load your stats."
                onRetry={() => {
                  void rank.refetch()
                  void games.refetch()
                }}
              />
            ) : (
              <Card aria-busy="true" aria-label="Loading your stats">
                <Skeleton className="h-8 w-2/3" />
                <Skeleton className="mt-4 h-24" />
              </Card>
            )}
          </div>
        </div>
      </div>
      <ClubCard clubId={clubCard} onClose={() => setClubCard(null)} />
      {sharing.sheet}
    </main>
  )
}
