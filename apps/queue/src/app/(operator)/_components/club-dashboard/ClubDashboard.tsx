'use client'

import { useClub } from '@rotra/data/club'
import { DEMO_CLUB_ID } from '@rotra/data/fixtures/clubs'
import { useClubLicense } from '@rotra/data/license/useClubLicense'
import { useNowCard } from '@rotra/data/queue-session/useNowCard'
import { useQueueSessions } from '@rotra/data/queue-session/useQueueSessions'
import { CalendarDaySheet } from '@rotra/ui/calendar-day-sheet'
import { ClubHeader } from '@rotra/ui/club-header'
import { formatIsoDate } from '@rotra/ui/license-panel'
import { NowCard } from '@rotra/ui/now-card'
import { type CalendarEvent, type CalendarView, SessionCalendar } from '@rotra/ui/session-calendar'
import { dayKey } from '@rotra/ui/session-calendar/helpers'
import { Skeleton } from '@rotra/ui/skeleton'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { longDayLabel, sessionHref, toDateParam } from '@/lib/dates'
import { useAppSelector } from '@/store/hooks'
import { selectAccount } from '@/store/slices/authSlice'

const KIND: Record<string, CalendarEvent['kind']> = {
  active: 'live',
  finalizing: 'live',
  prepared: 'prepared',
  completed: 'completed',
  invalid: 'invalid',
}

/** Q-HOME: club header, the now card and the calendar; every session opens from here. */
export function ClubDashboard() {
  const router = useRouter()
  const clubId = useAppSelector(selectAccount)?.id ?? DEMO_CLUB_ID
  const club = useClub(clubId)
  const license = useClubLicense()
  const nowCard = useNowCard(clubId)
  const sessions = useQueueSessions(clubId)

  const [now] = useState(() => Date.now())
  const [reference, setReference] = useState(() => new Date().setHours(0, 0, 0, 0))
  const [selected, setSelected] = useState<number>()
  const [openDay, setOpenDay] = useState<number | null>(null)

  const createSession = (date?: number) =>
    router.push(date ? `/sessions/new?date=${toDateParam(date)}` : '/sessions/new')
  const openSession = (sessionId: string) => {
    const session = sessions.data?.find((s) => s.id === sessionId)
    if (session) router.push(sessionHref(session))
  }

  const events: CalendarEvent[] = (sessions.data ?? []).map((s) => ({
    sessionId: s.id,
    title: s.title,
    venueName: s.venueName,
    startsAt: s.scheduledStartAt,
    endsAt: s.scheduledEndAt,
    kind: KIND[s.state] ?? 'completed',
  }))
  const dayEvents =
    openDay === null ? [] : events.filter((e) => dayKey(e.startsAt) === dayKey(openDay))

  const move = (direction: -1 | 1, view: CalendarView) => {
    const r = new Date(reference)
    setReference(
      view === 'month'
        ? new Date(r.getFullYear(), r.getMonth() + direction, 1).getTime()
        : new Date(
            r.getFullYear(),
            r.getMonth(),
            r.getDate() + direction * (view === 'week' ? 7 : 1),
          ).getTime(),
    )
  }

  const live = nowCard.data?.live
  const upcoming = nowCard.data?.upcoming

  return (
    <main className="mx-auto flex max-w-[1240px] flex-col gap-5 px-[max(16px,env(safe-area-inset-left,0px))] pt-5 pb-[120px]">
      {club.data ? (
        <ClubHeader
          clubName={club.data.name}
          initials={club.data.initials}
          logoUrl={club.data.logoUrl}
          todayLabel={longDayLabel(now)}
          licenseLine={
            license.data
              ? `${license.data.plan} license · active until ${formatIsoDate(license.data.activeUntil)}`
              : 'License'
          }
          foundingLine={`Founded at ${club.data.foundingAddress}`}
          onCreateSession={() => createSession()}
        />
      ) : (
        <div className="flex items-center gap-4">
          <Skeleton className="size-[76px] rounded-[20px]" />
          <div className="flex flex-col gap-2">
            <Skeleton className="w-40" />
            <Skeleton className="h-7 w-64" />
            <Skeleton className="w-72" />
          </div>
        </div>
      )}
      {nowCard.isPending ? (
        <Skeleton className="h-40 rounded-[18px]" />
      ) : live ? (
        <NowCard
          variant="live"
          title={live.title}
          venueName={live.venueName}
          startsAt={live.scheduledStartAt}
          endsAt={live.scheduledEndAt}
          courtsInUse={live.courtsInUse}
          courts={Math.max(1, Math.round(live.capacity / live.playersPerCourt))}
          gamesPlayed={live.gamesPlayed}
          presentCount={live.presentCount}
          rosterCount={live.rosterCount}
          queuedCount={live.queuedCount}
          upNext={
            nowCard.data?.upNext
              ? { title: nowCard.data.upNext.title, startsAt: nowCard.data.upNext.scheduledStartAt }
              : undefined
          }
          onContinue={() => router.push(`/sessions/${live.id}`)}
        />
      ) : upcoming ? (
        <NowCard
          variant="upcoming"
          title={upcoming.title}
          venueName={upcoming.venueName}
          startsAt={upcoming.scheduledStartAt}
          endsAt={upcoming.scheduledEndAt}
          rosterCount={upcoming.rosterCount}
          capacity={upcoming.capacity}
          waitlistCount={upcoming.waitlistCount}
          courts={Math.max(1, Math.round(upcoming.capacity / upcoming.playersPerCourt))}
          downloadedHere={upcoming.downloadedHere}
          onOpenPreparation={() => router.push(`/sessions/${upcoming.id}/preparation`)}
        />
      ) : (
        <NowCard variant="nothing" onCreateSession={() => createSession()} />
      )}
      {sessions.isPending ? (
        <Skeleton className="h-80 rounded-lg" />
      ) : (
        <SessionCalendar
          events={events}
          referenceDate={reference}
          today={now}
          selectedDate={selected}
          onMove={move}
          onToday={() => {
            setReference(new Date().setHours(0, 0, 0, 0))
            setSelected(undefined)
          }}
          onOpenDay={(date) => {
            setSelected(date)
            setReference(date)
            setOpenDay(date)
          }}
          onOpenSession={openSession}
          onCreateOnDay={createSession}
        />
      )}
      <CalendarDaySheet
        open={openDay !== null}
        onOpenChange={(open) => {
          if (!open) setOpenDay(null)
        }}
        date={openDay ?? now}
        today={now}
        events={dayEvents}
        onOpenSession={openSession}
        onCreateOnDay={createSession}
      />
    </main>
  )
}
