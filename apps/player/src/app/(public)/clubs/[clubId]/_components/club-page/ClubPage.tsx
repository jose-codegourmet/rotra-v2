'use client'
import {
  CLUB_MEMBERS_PAGE,
  calendarMonthRange,
  monthIndex,
  sessionsThisMonth,
  upcomingSessions,
} from '@rotra/data/club-page/rules'
import { useClubPage } from '@rotra/data/club-page/useClubPage'
import { useLeaveClub } from '@rotra/data/player-club/useLeaveClub'
import { useThrottledRefresh } from '@rotra/data/refresh/useThrottledRefresh'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { ClubCalendar } from '@rotra/ui/club-calendar'
import { ClubMemberGrid } from '@rotra/ui/club-member-grid'
import { ClubNextUpCard } from '@rotra/ui/club-next-up-card'
import { ClubPageHero } from '@rotra/ui/club-page-hero'
import { ClubSessionList } from '@rotra/ui/club-session-list'
import { ConfirmSheet } from '@rotra/ui/confirm-sheet'
import { ErrorState } from '@rotra/ui/error-state'
import { levelLabel } from '@rotra/ui/level-pill'
import { PullToRefresh } from '@rotra/ui/pull-to-refresh'
import { Skeleton } from '@rotra/ui/skeleton'
import { toast } from '@rotra/ui/toaster'
import { notFound, useRouter } from 'next/navigation'
import { useState } from 'react'
import { pictureSrc } from '@/app/_components/profile-picture/pictureSrc'
import { MemberProfile } from '../member-profile/MemberProfile'

/** The page link visitors share; separate from the club's invite link (D-2026-11-11-11). */
export async function copyClubPageLink(clubId: string) {
  const link = `${window.location.origin}/clubs/${encodeURIComponent(clubId)}`
  try {
    await navigator.clipboard.writeText(link)
    toast('Club page link copied')
  } catch {
    toast(`Couldn't copy. The club page link is ${link}`)
  }
}

function Loading() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading the club page"
      className="mx-auto flex w-full max-w-[1180px] flex-col gap-5 px-4 pt-5 pb-[120px]"
    >
      <Card>
        <div className="flex items-center gap-3.5">
          <Skeleton className="size-[88px] flex-none rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-5 w-1/2" />
          </div>
        </div>
        <Skeleton className="mt-4 h-16" />
      </Card>
      <div className="grid grid-cols-1 items-start gap-5 min-[920px]:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-5">
          <Skeleton className="h-24" />
          <Skeleton className="h-80" />
        </div>
        <Skeleton className="h-64" />
      </div>
    </main>
  )
}

/** P-CLUB-PAGE: a club's public page (#737, epic P07). */
export function ClubPage({ clubId }: { clubId: string }) {
  const router = useRouter()
  const page = useClubPage(clubId)
  // Pull down (or come back to the tab) to refresh the next session and calendar, once every 10 seconds.
  const refreshing = useThrottledRefresh(() => page.refetch(), { refreshOnReturn: true })
  const [shown, setShown] = useState(CLUB_MEMBERS_PAGE)
  const [monthOffset, setMonthOffset] = useState(0)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [openKey, setOpenKey] = useState<string | null>(null)
  const leaveClub = useLeaveClub()
  const [leaving, setLeaving] = useState(false)
  if (page.data === null) notFound()
  if (!page.data)
    return page.isError ? (
      <main className="mx-auto max-w-[920px] px-4 pt-5">
        <ErrorState
          title="Couldn't load the club page."
          retryLabel="Retry"
          retrying={page.isFetching}
          onRetry={() => void page.refetch()}
        >
          Check your connection, then try again.
        </ErrorState>
      </main>
    ) : (
      <Loading />
    )
  const { club, members, sessions, signedIn, viewerIsMember } = page.data
  const now = Date.now()
  const upcoming = upcomingSessions(sessions)
  const next = upcoming[0] ?? null
  const month = sessionsThisMonth(sessions, now)
  const range = calendarMonthRange(sessions, now)
  const offset = Math.max(
    range.min - range.current,
    Math.min(monthOffset, range.max - range.current),
  )
  const today = new Date(now)
  const referenceDate = new Date(today.getFullYear(), today.getMonth() + offset, 1).getTime()
  const visible = members.slice(0, shown)
  const picture = (m: (typeof members)[number]) =>
    pictureSrc(m.picture, m.playerId ?? m.key, m.name) ?? null
  const row = (s: (typeof upcoming)[number]) => ({
    id: s.id,
    title: s.title,
    startsAt: s.startsAt,
    endsAt: s.endsAt,
    live: s.status === 'live',
    href: s.href ?? '#',
  })
  const updatedLabel = page.dataUpdatedAt
    ? new Date(page.dataUpdatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : undefined
  return (
    <PullToRefresh
      onRefresh={refreshing.refresh}
      throttled={!refreshing.canRefresh}
      refreshing={refreshing.isRefreshing}
      updatedLabel={updatedLabel}
      disabled={openKey !== null || leaving}
    >
      <main className="mx-auto flex w-full max-w-[1180px] flex-col gap-5 px-4 pt-5 pb-[120px]">
        <div className="flex flex-col gap-1.5">
          <Button size="sm" variant="ghost" className="self-start" onClick={() => router.push('/')}>
            ← Leaderboard
          </Button>
        </div>
        <ClubPageHero
          name={club.name}
          initials={club.initials}
          logoUrl={club.logoUrl}
          city={club.city}
          memberCount={members.length}
          membersShown={visible.length}
          upcomingCount={upcoming.length}
          next={next ? { live: next.status === 'live', startsAt: next.startsAt } : null}
          monthCount={month.count}
          monthDone={month.done}
          joinHref={club.joinHref}
          onShare={() => void copyClubPageLink(club.id)}
          onLeave={
            signedIn && viewerIsMember
              ? () => {
                  leaveClub.reset()
                  setLeaving(true)
                }
              : undefined
          }
        />
        <ConfirmSheet
          open={leaving}
          onOpenChange={setLeaving}
          title={`Leave ${club.name}?`}
          consequence="You're removed from the club's saved players. Your past games stay."
          confirmLabel="Leave club"
          backLabel="Cancel"
          isPending={leaveClub.isPending}
          error={leaveClub.error?.message}
          onConfirm={() =>
            leaveClub.mutate(club.id, {
              onSuccess: () => {
                setLeaving(false)
                toast(`You left ${club.name}`)
              },
              onError: (error) => toast.error(error.message),
            })
          }
        />
        <div className="grid grid-cols-1 items-start gap-5 min-[920px]:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex min-w-0 flex-col gap-5">
            {next ? <ClubNextUpCard {...row(next)} /> : null}
            <ClubSessionList upcomingCount={upcoming.length} rest={upcoming.slice(1).map(row)} />
            <ClubCalendar
              sessions={sessions}
              referenceDate={referenceDate}
              today={now}
              selectedDate={selectedDay}
              canMovePrevious={range.current + offset > range.min}
              canMoveNext={range.current + offset < range.max}
              onMove={(direction) => setMonthOffset(offset + direction)}
              onToday={() => {
                setMonthOffset(0)
                setSelectedDay(new Date(now).setHours(0, 0, 0, 0))
              }}
              onSelectDay={(date) => {
                setSelectedDay(date)
                if (date !== null) setMonthOffset(monthIndex(date) - range.current)
              }}
            />
          </div>
          <aside className="flex min-w-0 flex-col gap-5">
            <ClubMemberGrid
              members={visible.map((m) => ({
                key: m.key,
                name: m.name,
                picture: picture(m),
                caption: m.isYou ? 'You' : levelLabel(m.level),
                openable: signedIn && !m.masked,
              }))}
              totalCount={members.length}
              signedIn={signedIn}
              onShowMore={() => setShown((n) => n + CLUB_MEMBERS_PAGE)}
              seeAllHref={`/clubs/${encodeURIComponent(club.id)}/members`}
              onOpen={setOpenKey}
            />
          </aside>
        </div>
        <MemberProfile
          member={members.find((m) => m.key === openKey) ?? null}
          onClose={() => setOpenKey(null)}
        />
      </main>
    </PullToRefresh>
  )
}
