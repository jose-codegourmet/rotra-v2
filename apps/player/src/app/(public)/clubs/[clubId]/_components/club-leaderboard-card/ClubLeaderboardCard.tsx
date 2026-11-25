'use client'
import type {
  LeaderboardPeriod,
  LeaderboardRow as LeaderboardRowData,
} from '@rotra/data/leaderboard/types'
import { useClubLeaderboard } from '@rotra/data/leaderboard/useClubLeaderboard'
import { isRealDataMode } from '@rotra/data/real/mode'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { EmptyState } from '@rotra/ui/empty-state'
import { ErrorState } from '@rotra/ui/error-state'
import { LeaderboardList } from '@rotra/ui/leaderboard-list'
import {
  LEADERBOARD_PERIOD_COPY,
  LeaderboardPeriodSwitch,
} from '@rotra/ui/leaderboard-period-switch'
import { LeaderboardRow } from '@rotra/ui/leaderboard-row'
import { useEffect } from 'react'
import {
  LeaderboardPodium,
  leaderboardDateLabel,
  leaderboardProfilePerson,
  leaderboardRowOpens,
  placeCounts,
} from '@/app/_components/leaderboard-podium/LeaderboardPodium'
import type { ProfileCardPerson } from '@/app/_components/profile-card/ProfileCard'
import { pictureSrc } from '@/app/_components/profile-picture/pictureSrc'
import { useAppSelector } from '@/store/hooks'
import { selectAccount } from '@/store/slices/authSlice'
import { selectDev } from '@/store/slices/devSlice'

/** The club page card shows the podium and the next 7 players after it (the top 10 when no place is shared). */
export const CLUB_LEADERBOARD_CARD_ROWS = 7

/**
 * One club's leaderboard query with the page states both club surfaces share: loading (no podium),
 * error, and the rows after the podium. It loads more pages until places 1 to 3 are complete.
 */
export function useClubBoard(clubId: string, period: LeaderboardPeriod) {
  const account = useAppSelector(selectAccount)
  const dev = useAppSelector(selectDev)
  const viewerId = account?.id
  const board = useClubLeaderboard(clubId, period, viewerId)
  const entries = board.data?.pages.flatMap((page) => page.entries) ?? []
  const total = board.data?.pages[0]?.total ?? 0
  const mockScenario = isRealDataMode() ? null : dev.leaderboardScenario
  const loading = mockScenario === 'loading' || (board.isPending && !board.data)
  const failed = mockScenario === 'error' || (board.isError && !board.data)
  const lastPosition = entries[entries.length - 1]?.position ?? 0
  const { hasNextPage, isFetching, isError, fetchNextPage } = board
  useEffect(() => {
    if (lastPosition && lastPosition <= 3 && hasNextPage && !isFetching && !isError)
      void fetchNextPage()
  }, [lastPosition, hasNextPage, isFetching, isError, fetchNextPage])
  const counts = placeCounts(entries)
  return {
    board,
    viewerId,
    entries,
    total,
    loading,
    failed,
    afterPodium: entries.filter((entry) => entry.position > 3),
    dateLabel: leaderboardDateLabel(period, board.data?.pages[0]?.periodStart),
    shared: (entry: LeaderboardRowData) => (counts.get(entry.position) ?? 0) > 1,
  }
}

/** A club leaderboard row: full name, nickname and picture; a profile the viewer may not open is not a button. */
export function ClubLeaderboardRow({
  entry,
  period,
  viewerId,
  shared,
  onOpenPlayer,
}: {
  entry: LeaderboardRowData
  period: LeaderboardPeriod
  viewerId?: string
  shared: boolean
  onOpenPlayer: (entry: LeaderboardRowData) => void
}) {
  return (
    <LeaderboardRow
      id={`club-leaderboard-${entry.id}`}
      position={entry.position}
      period={period}
      wins={entry.wins}
      previousPosition={entry.previousPosition}
      unclaimed={entry.unclaimed}
      fullName={entry.fullName}
      nickname={entry.nickname}
      picture={{ src: pictureSrc(entry.pictureUrl, entry.id, entry.fullName) }}
      isMe={entry.id === viewerId}
      shared={shared}
      onSelect={leaderboardRowOpens(entry) ? () => onOpenPlayer(entry) : undefined}
    />
  )
}

/**
 * P-CLUB-PAGE › Leaderboard card (rotra-player.html `clubBoardCard`): the four-period switch, the
 * podium, then the next 7 players after it. **See all** opens P-CLUB-LEADERBOARD.
 */
export function ClubLeaderboardCard({
  clubId,
  clubName,
  period,
  onPeriodChange,
  onOpenPlayer,
}: {
  clubId: string
  clubName: string
  /** The card's own period, separate from the ROTRA leaderboard's */
  period: LeaderboardPeriod
  onPeriodChange: (period: LeaderboardPeriod) => void
  /** Opens the profile card */
  onOpenPlayer: (person: ProfileCardPerson) => void
}) {
  const club = useClubBoard(clubId, period)
  const open = (entry: LeaderboardRowData) =>
    onOpenPlayer(leaderboardProfilePerson(entry, club.viewerId))
  const { board } = club
  const when = LEADERBOARD_PERIOD_COPY[period].current
  const rows = club.afterPodium.slice(0, CLUB_LEADERBOARD_CARD_ROWS)
  const seeAll = `/clubs/${encodeURIComponent(clubId)}/leaderboard${period === 'year' ? '' : `?period=${period}`}`
  return (
    <Card asChild>
      <section aria-labelledby="club-leaderboard-title" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="club-leaderboard-title">Leaderboard</h2>
          {!club.loading && !club.failed && club.total > 0 ? (
            <Button size="xs" asChild>
              <a href={seeAll}>See all</a>
            </Button>
          ) : null}
        </div>
        <LeaderboardPeriodSwitch
          period={period}
          dateLabel={club.dateLabel}
          onChange={onPeriodChange}
        />
        {!club.loading && !club.failed ? (
          <LeaderboardPodium
            rows={club.entries}
            period={period}
            dateLabel={club.dateLabel}
            scope={clubName}
            viewerId={club.viewerId}
            onOpenPlayer={open}
          />
        ) : null}
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
            note={rows.length ? undefined : 'Everyone on this list so far is on the podium.'}
          >
            {rows.map((entry) => (
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
      </section>
    </Card>
  )
}
