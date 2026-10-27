'use client'

import {
  activeMatches,
  matchStatus,
  shortName,
  waitingMatches,
} from '@rotra/data/match/match.rules'
import { useLiveStandings } from '@rotra/data/match/useLiveStandings'
import { useSessionMatches } from '@rotra/data/match/useSessionMatches'
import { MockError } from '@rotra/data/mock/errors'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import { useSessionRoster } from '@rotra/data/session-roster/useSessionRoster'
import { Button } from '@rotra/ui/button'
import { Chip } from '@rotra/ui/chip'
import { ConsoleFooterBar } from '@rotra/ui/console-footer-bar'
import { formatTime } from '@rotra/ui/now-card/helpers'
import { PageHeader } from '@rotra/ui/page-header'
import { Sheet } from '@rotra/ui/sheet'
import { Skeleton } from '@rotra/ui/skeleton'
import { type TabItem, Tabs, TabsContent } from '@rotra/ui/tabs'
import Link from 'next/link'
import { notFound, useRouter } from 'next/navigation'
import { type ComponentType, useEffect, useMemo, useState } from 'react'
import { useDockAction } from '@/app/(operator)/_components/operator-shell/DockAction.context'
import { QueryError } from '@/app/(operator)/_components/query-error/QueryError'
import { CourtsAndTime } from '@/app/(operator)/sessions/[sessionId]/_components/courts-and-time/CourtsAndTime'
import { FacebookPost } from '@/app/(operator)/sessions/[sessionId]/_components/facebook-post/FacebookPost'
import { JoinRequests } from '@/app/(operator)/sessions/[sessionId]/_components/join-requests/JoinRequests'
import { LeaderboardView } from '@/app/(operator)/sessions/[sessionId]/_components/leaderboard-view/LeaderboardView'
import { PlayerProfile } from '@/app/(operator)/sessions/[sessionId]/_components/player-profile/PlayerProfile'
import { PlayersView } from '@/app/(operator)/sessions/[sessionId]/_components/players-view/PlayersView'
import { SessionView } from '@/app/(operator)/sessions/[sessionId]/_components/session-view/SessionView'
import { sessionHref } from '@/lib/dates'
import { useAppSelector } from '@/store/hooks'
import { selectDev } from '@/store/slices/devSlice'

export type SessionConsoleProps = { sessionId: string }

export type ConsoleView = 'session' | 'queue' | 'players' | 'leaderboard'
export type ConsoleSheet = 'join-requests' | 'post' | 'adjust' | 'add-court' | null

/** What every console view container receives from the shell */
export type ConsoleViewProps = {
  sessionId: string
  onOpenProfile: (clubPlayerId: string) => void
  onOpenQueue: () => void
}

/**
 * The views other tickets add, one container file each; the shell shows a view's tab and panel as
 * soon as it is listed here. Queue (Queue › Match queue) is hidden until then; Players and
 * Leaderboard (Players and Leaderboard views) keep their tab and a Skeleton panel.
 */
const VIEWS: Partial<Record<Exclude<ConsoleView, 'session'>, ComponentType<ConsoleViewProps>>> = {
  // queue: QueueView,
  players: PlayersView,
  leaderboard: LeaderboardView,
}

const MODE_LABELS = { chill: 'Chill', fair: 'Fair', hard: 'Hard' } as const

/**
 * Q-CONSOLE: the live session shell. Header with the mode, formats and minimum chips and the
 * Home / Public page / Copy Facebook post / Extend time / Join requests · N actions, the view tabs
 * with live counts, the view panels (Session here; the others arrive in their own containers), the
 * ConsoleFooterBar and the dock's Session done pill. Sessions that are not live go to their own
 * screen: prepared to /preparation, finished or invalid to /record, unknown ids to notFound().
 */
export function SessionConsole({ sessionId }: SessionConsoleProps) {
  const router = useRouter()
  const dev = useAppSelector(selectDev)
  const session = useQueueSession(sessionId)
  const roster = useSessionRoster(sessionId)
  const matches = useSessionMatches(sessionId)
  const standings = useLiveStandings(sessionId)
  const [view, setView] = useState<ConsoleView>('session')
  const [sheet, setSheet] = useState<ConsoleSheet>(null)
  const [profileId, setProfileId] = useState<string | null>(null)

  const s = session.data
  if (session.isError && session.error instanceof MockError && session.error.kind === 'permission')
    notFound()
  const redirectTo = s && s.state !== 'active' && s.state !== 'finalizing' ? sessionHref(s) : null
  useEffect(() => {
    if (redirectTo) router.replace(redirectTo)
  }, [redirectTo, router])

  // Session done is wired by Queue › Session finalization; until then the pill stays disabled.
  const sessionDone = useMemo(
    () => ({
      label: 'Session done',
      icon: 'check' as const,
      disabled: true,
      onClick: () => undefined,
    }),
    [],
  )
  useDockAction(sessionDone)

  const rosterList = roster.data?.roster ?? []
  const courts = s?.courts ?? []
  const all = matches.data ?? []
  const ctx = { roster: rosterList, matches: all, courts }
  const waiting = waitingMatches(all)
  const active = activeMatches(all)
  const recorded = all.filter((m) => m.state === 'completed').length
  const inUse = active.reduce((n, m) => n + m.courtIds.length, 0)
  const attention = waiting.filter((m) => matchStatus(m, ctx).kind === 'needs-attention').length
  const present = rosterList.filter((p) => p.present).length
  const pendingRequests = (roster.data?.joinRequests ?? []).filter(
    (r) => r.status === 'pending',
  ).length
  const leader = standings.data?.[0]
  const leaderPlayer = leader ? rosterList.find((p) => p.id === leader.playerId) : undefined
  const formats =
    [s?.allowSingles && 'Singles', s?.allowDoubles && 'Doubles'].filter(Boolean).join(' + ') ||
    'No standard format'

  const tabs: TabItem[] = [
    {
      value: 'session',
      label: 'Session',
      badges: [{ text: `${inUse}/${courts.length}`, longText: ' courts in use' }],
    },
    ...(VIEWS.queue
      ? [
          {
            value: 'queue',
            label: 'Queue',
            badges: [
              { text: String(waiting.length), longText: ' waiting' },
              ...(attention
                ? [{ text: String(attention), longText: ' need attention', tone: 'warn' as const }]
                : []),
            ],
          },
        ]
      : []),
    {
      value: 'players',
      label: 'Players',
      badges: [{ text: `${present}/${rosterList.length}`, longText: ' present' }],
    },
    {
      value: 'leaderboard',
      label: 'Leaderboard',
      shortLabel: 'Board',
      badges: leader
        ? [{ text: `${leaderPlayer ? shortName(leaderPlayer) : leader.name} leads` }]
        : [],
    },
  ]

  const viewProps: ConsoleViewProps = {
    sessionId,
    onOpenProfile: setProfileId,
    onOpenQueue: () => setView(VIEWS.queue ? 'queue' : 'session'),
  }
  const panel = (key: Exclude<ConsoleView, 'session'>) => {
    const View = VIEWS[key]
    return View ? <View {...viewProps} /> : <Skeleton className="h-56 rounded-lg" />
  }

  if (session.isError)
    return (
      <main className="mx-auto max-w-[1240px] px-4 pt-5">
        <QueryError query={session} title="Couldn't load this session." />
      </main>
    )

  return (
    <main className="mx-auto flex max-w-[1240px] flex-col gap-5 px-[max(16px,env(safe-area-inset-left,0px))] pt-5 pb-[170px]">
      {s ? (
        <PageHeader
          eyebrow={
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold tracking-[0.5px] text-fg2 uppercase">
                Live session
              </span>
              <Chip>{MODE_LABELS[s.sessionMode]}</Chip>
              <Chip>{formats}</Chip>
              <Chip>Min {s.minimumGames} games</Chip>
            </span>
          }
          title={s.title}
          description={`${s.venueName} · Started ${formatTime(s.startedAt ?? s.scheduledStartAt)} · Ends ${formatTime(s.scheduledEndAt)}`}
          actions={
            <>
              <Button size="sm" asChild>
                <Link href="/">Home</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href={`/s/${s.publicSlug}`}>Public page</Link>
              </Button>
              <Button size="sm" onClick={() => setSheet('post')}>
                Copy Facebook post
              </Button>
              <Button size="sm" onClick={() => setSheet('adjust')}>
                Extend time
              </Button>
              {pendingRequests > 0 ? (
                <Button size="sm" variant="primary" onClick={() => setSheet('join-requests')}>
                  Join requests · {pendingRequests}
                </Button>
              ) : null}
            </>
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          <Skeleton className="w-24" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="w-72" />
        </div>
      )}
      <Tabs
        aria-label="Console views"
        value={view}
        onChange={(value) => setView(value as ConsoleView)}
        items={tabs}
      >
        <TabsContent value="session" className="flex flex-col gap-5">
          <SessionView {...viewProps} onAddCourt={() => setSheet('add-court')} />
        </TabsContent>
        <TabsContent value="queue">{panel('queue')}</TabsContent>
        <TabsContent value="players">{panel('players')}</TabsContent>
        <TabsContent value="leaderboard">{panel('leaderboard')}</TabsContent>
      </Tabs>
      <ConsoleFooterBar
        gamesRecorded={recorded}
        inPlay={active.length}
        waiting={waiting.length}
        online={!dev.offline}
      />
      <Sheet
        open={sheet === 'join-requests'}
        onOpenChange={(open) => setSheet(open ? 'join-requests' : null)}
        title="Join requests"
        footer={
          <Button variant="primary" onClick={() => setSheet(null)}>
            Done
          </Button>
        }
      >
        <JoinRequests sessionId={sessionId} variant="sheet" />
      </Sheet>
      <FacebookPost
        sessionId={sessionId}
        open={sheet === 'post'}
        onOpenChange={(open) => setSheet(open ? 'post' : null)}
      />
      <CourtsAndTime
        sessionId={sessionId}
        open={sheet === 'adjust' || sheet === 'add-court' ? sheet : null}
        onOpenChange={setSheet}
      />
      <PlayerProfile clubPlayerId={profileId} onClose={() => setProfileId(null)} />
    </main>
  )
}
