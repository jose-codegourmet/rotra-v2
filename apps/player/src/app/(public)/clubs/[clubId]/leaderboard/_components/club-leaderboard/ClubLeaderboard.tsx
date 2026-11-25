'use client'
import { useClubPage } from '@rotra/data/club-page/useClubPage'
import {
  LEADERBOARD_LIMIT,
  LEADERBOARD_PERIODS,
  type LeaderboardPeriod,
} from '@rotra/data/leaderboard/types'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { EmptyState } from '@rotra/ui/empty-state'
import { ErrorState } from '@rotra/ui/error-state'
import { LeaderboardList } from '@rotra/ui/leaderboard-list'
import {
  LEADERBOARD_PERIOD_COPY,
  LeaderboardPeriodSwitch,
} from '@rotra/ui/leaderboard-period-switch'
import { PageHeader } from '@rotra/ui/page-header'
import { Skeleton } from '@rotra/ui/skeleton'
import { notFound, useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import {
  LeaderboardPodium,
  leaderboardProfilePerson,
} from '@/app/_components/leaderboard-podium/LeaderboardPodium'
import { ProfileCard, type ProfileCardPerson } from '@/app/_components/profile-card/ProfileCard'
import {
  ClubLeaderboardRow,
  useClubBoard,
} from '../../../_components/club-leaderboard-card/ClubLeaderboardCard'

/** P-CLUB-LEADERBOARD: a club's whole top 50, from place 4 under the podium (rotra-player.html `viewClubBoard`). */
export function ClubLeaderboard({ clubId }: { clubId: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const page = useClubPage(clubId)
  const requested = searchParams.get('period')
  const [period, setPeriod] = useState<LeaderboardPeriod>(
    LEADERBOARD_PERIODS.find((value) => value === requested) ?? 'year',
  )
  const [card, setCard] = useState<ProfileCardPerson | null>(null)
  const club = useClubBoard(clubId, period)
  const { board } = club
  if (page.data === null) notFound()
  if (!page.data)
    return page.isError ? (
      <main className="mx-auto max-w-[920px] px-4 pt-5">
        <ErrorState
          title="Couldn't load the club leaderboard."
          retrying={page.isFetching}
          onRetry={() => void page.refetch()}
        >
          Check your connection, then try again.
        </ErrorState>
      </main>
    ) : (
      <main
        aria-busy="true"
        aria-label="Loading the club leaderboard"
        className="mx-auto flex w-full max-w-[920px] flex-col gap-5 px-4 pt-5"
      >
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </main>
    )
  const { name } = page.data.club
  const when = LEADERBOARD_PERIOD_COPY[period].current
  const changePeriod = (next: LeaderboardPeriod) => {
    if (next === period) return
    setPeriod(next)
    const url = new URL(window.location.href)
    if (next === 'year') url.searchParams.delete('period')
    else url.searchParams.set('period', next)
    window.history.replaceState(null, '', url)
  }
  const open = (entry: Parameters<typeof leaderboardProfilePerson>[0]) =>
    setCard(leaderboardProfilePerson(entry, club.viewerId))
  return (
    <main className="mx-auto flex max-w-[920px] flex-col gap-5 pr-[max(16px,env(safe-area-inset-right,0px))] pl-[max(16px,env(safe-area-inset-left,0px))] pt-5 pb-[120px]">
      <header className="flex flex-col gap-1.5">
        <Button
          size="sm"
          variant="ghost"
          className="self-start"
          onClick={() => router.push(`/clubs/${encodeURIComponent(clubId)}`)}
        >
          ← {name}
        </Button>
        <PageHeader
          eyebrow={name}
          className="[&>div>div:first-child]:text-xs [&>div>div:first-child]:font-semibold [&>div>div:first-child]:tracking-[0.6px] [&>div>div:first-child]:text-fg2 [&>div>div:first-child]:uppercase"
          title="Leaderboard"
          description={`The top ${LEADERBOARD_LIMIT} in ${name}'s sessions. Most wins ${when} comes first. Only games played in this club's sessions count.`}
        />
        <LeaderboardPeriodSwitch
          period={period}
          dateLabel={club.dateLabel}
          onChange={changePeriod}
        />
      </header>
      {!club.loading && !club.failed ? (
        <LeaderboardPodium
          rows={club.entries}
          period={period}
          dateLabel={club.dateLabel}
          scope={name}
          viewerId={club.viewerId}
          onOpenPlayer={open}
        />
      ) : null}
      <Card className="flex flex-col gap-4">
        {club.failed ? (
          <ErrorState
            title="Couldn't load the club leaderboard."
            onRetry={() => void board.refetch()}
            retrying={board.isFetching}
          >
            Check your connection, then try again.
          </ErrorState>
        ) : club.loading ? (
          <LeaderboardList loading loadingRows={4} period={period} />
        ) : club.total === 0 ? (
          <div role="status">
            <EmptyState>
              No one has won a standard match in this club&apos;s sessions {when} yet.
            </EmptyState>
          </div>
        ) : (
          <LeaderboardList
            period={period}
            busy={board.isFetching}
            note={
              club.afterPodium.length ? undefined : 'Everyone on this list so far is on the podium.'
            }
            shown={club.entries.length}
            total={club.total}
            onShowMore={
              board.hasNextPage
                ? () => {
                    if (!board.isFetching) void board.fetchNextPage()
                  }
                : undefined
            }
          >
            {club.afterPodium.map((entry) => (
              <ClubLeaderboardRow
                key={entry.id}
                entry={entry}
                period={period}
                viewerId={club.viewerId}
                shared={club.shared(entry)}
                onOpenPlayer={open}
              />
            ))}
          </LeaderboardList>
        )}
      </Card>
      <ProfileCard person={card} onClose={() => setCard(null)} />
    </main>
  )
}
