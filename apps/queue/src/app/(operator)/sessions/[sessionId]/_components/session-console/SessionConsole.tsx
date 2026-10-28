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
import { useSyncState } from '@rotra/data/sync/useSyncState'
import { Button } from '@rotra/ui/button'
import { Chip } from '@rotra/ui/chip'
import { ConsoleFooterBar } from '@rotra/ui/console-footer-bar'
import { Notice } from '@rotra/ui/notice'
import { formatTime } from '@rotra/ui/now-card/helpers'
import { PageHeader } from '@rotra/ui/page-header'
import { Sheet } from '@rotra/ui/sheet'
import { Skeleton } from '@rotra/ui/skeleton'
import { type TabItem, Tabs, TabsContent } from '@rotra/ui/tabs'
import Link from 'next/link'
import { notFound, useRouter } from 'next/navigation'
import { type ComponentType, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDockAction } from '@/app/(operator)/_components/operator-shell/DockAction.context'
import { QueryError } from '@/app/(operator)/_components/query-error/QueryError'
import { ActiveMatch } from '@/app/(operator)/sessions/[sessionId]/_components/active-match/ActiveMatch'
import { AutoQueue } from '@/app/(operator)/sessions/[sessionId]/_components/auto-queue/AutoQueue'
import { CourtsAndTime } from '@/app/(operator)/sessions/[sessionId]/_components/courts-and-time/CourtsAndTime'
import { FacebookPost } from '@/app/(operator)/sessions/[sessionId]/_components/facebook-post/FacebookPost'
import { JoinRequests } from '@/app/(operator)/sessions/[sessionId]/_components/join-requests/JoinRequests'
import { LeaderboardView } from '@/app/(operator)/sessions/[sessionId]/_components/leaderboard-view/LeaderboardView'
import {
  MatchLineup,
  type MatchLineupRequest,
} from '@/app/(operator)/sessions/[sessionId]/_components/match-lineup/MatchLineup'
import { PlayerProfile } from '@/app/(operator)/sessions/[sessionId]/_components/player-profile/PlayerProfile'
import { PlayersView } from '@/app/(operator)/sessions/[sessionId]/_components/players-view/PlayersView'
import { QueueView } from '@/app/(operator)/sessions/[sessionId]/_components/queue-view/QueueView'
import { RegenerateQueue } from '@/app/(operator)/sessions/[sessionId]/_components/regenerate-queue/RegenerateQueue'
import { SessionDoneFlow } from '@/app/(operator)/sessions/[sessionId]/_components/session-done-flow/SessionDoneFlow'
import { SessionView } from '@/app/(operator)/sessions/[sessionId]/_components/session-view/SessionView'
import {
  StartMatch,
  type StartMatchRequest,
} from '@/app/(operator)/sessions/[sessionId]/_components/start-match/StartMatch'
import { SuggestMatch } from '@/app/(operator)/sessions/[sessionId]/_components/suggest-match/SuggestMatch'
import { sessionHref } from '@/lib/dates'
import { useNow } from '@/lib/useNow'
import { useAppSelector } from '@/store/hooks'
import { selectDev } from '@/store/slices/devSlice'

export type SessionConsoleProps = { sessionId: string }

export type ConsoleView = 'session' | 'queue' | 'players' | 'leaderboard'
export type ConsoleSheet = 'join-requests' | 'post' | 'adjust' | 'add-court' | 'session-done' | null
/** The Queue › Match editing and generation sheets: Add match / Edit lineup, Suggested match, Auto queue, Regenerate */
export type MatchSheet =
  | MatchLineupRequest
  | { mode: 'suggest' }
  | { mode: 'auto' }
  | { mode: 'regenerate' }
  /** Open match on an in-game court card: the active match sheet (Queue › Match control) */
  | { mode: 'active'; matchId: string }
  /** Review and start, Start on a queue card, Pick another: the Start match and Choose match sheets (Queue › Match control) */
  | StartMatchRequest

/** What every console view container receives from the shell */
export type ConsoleViewProps = {
  sessionId: string
  /** The console clock: the time to measure waits, minutes in game and Booking ended against; moves every 30 s */
  now: number
  onOpenProfile: (clubPlayerId: string) => void
  onOpenQueue: () => void
}

const OFFLINE_NOTICE =
  'Working offline on this device. Matches, results and roster changes save here and sync when you reconnect. Session done needs internet.'

/**
 * The views other tickets add, one container file each; the shell shows a view's tab and panel as
 * soon as it is listed here; an unlisted Queue hides its tab, while unlisted Players and
 * Leaderboard keep their tab and a Skeleton panel.
 */
const VIEWS: Partial<Record<Exclude<ConsoleView, 'session'>, ComponentType<ConsoleViewProps>>> = {
  queue: QueueView,
  players: PlayersView,
  leaderboard: LeaderboardView,
}

const MODE_LABELS = { chill: 'Chill', fair: 'Fair', hard: 'Hard' } as const

/**
 * Q-CONSOLE: the live session shell. Header with the mode, formats and minimum chips and the
 * Home / Public page / Copy Facebook post / Extend time / Join requests · N actions, the view tabs
 * with live counts, the view panels (Session here; the others arrive in their own containers), the
 * ConsoleFooterBar and the dock's Session done pill. Sessions that are not live go to their own
 * screen: prepared to /preparation, finalizing to /finishing, finished or invalid to /record,
 * unknown ids to notFound().
 *
 * States: offline shows the warn notice and disables Session done in the footer and the dock (every
 * other action still works and its toast says "Saved on this device, waiting to sync"); the console
 * clock ticks every 30 s unless a sheet is open, a field has focus or a card is being dragged, and
 * each tick refetches the session so one finalized or invalidated elsewhere redirects to its record.
 */
export function SessionConsole({ sessionId }: SessionConsoleProps) {
  const router = useRouter()
  const dev = useAppSelector(selectDev)
  const session = useQueueSession(sessionId)
  const roster = useSessionRoster(sessionId)
  const matches = useSessionMatches(sessionId)
  const standings = useLiveStandings(sessionId)
  const sync = useSyncState()
  const [view, setView] = useState<ConsoleView>('session')
  const [sheet, setSheet] = useState<ConsoleSheet>(null)
  const [matchSheet, setMatchSheet] = useState<MatchSheet | null>(null)
  const [profileId, setProfileId] = useState<string | null>(null)

  const s = session.data
  if (session.isError && session.error instanceof MockError && session.error.kind === 'permission')
    notFound()
  const redirectTo = s && s.state !== 'active' ? sessionHref(s) : null
  useEffect(() => {
    if (redirectTo) router.replace(redirectTo)
  }, [redirectTo, router])

  // The 30-second refresh: the clock the views measure against, paused while a sheet is open here.
  const now = useNow(undefined, sheet !== null || matchSheet !== null || profileId !== null)
  const refetchSession = session.refetch
  const firstTick = useRef(true)
  // biome-ignore lint/correctness/useExhaustiveDependencies: `now` is the 30-second tick that triggers the refetch
  useEffect(() => {
    if (firstTick.current) {
      firstTick.current = false
      return
    }
    void refetchSession()
  }, [now, refetchSession])

  // Online from the sync state (the mock follows the DevMenu's Simulate offline toggle).
  const online = sync.data ? sync.data.online : !dev.offline

  // Session done opens the three-step sheet from the footer button and the dock pill alike; offline
  // both are disabled.
  const onSessionDone = useCallback(() => setSheet('session-done'), [])
  const sessionDone = useMemo(
    () => ({
      label: 'Session done',
      icon: 'check' as const,
      disabled: !online,
      onClick: onSessionDone,
    }),
    [online, onSessionDone],
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
    now,
    onOpenProfile: setProfileId,
    onOpenQueue: () => setView(VIEWS.queue ? 'queue' : 'session'),
  }
  const panel = (key: Exclude<ConsoleView, 'session'>) => {
    const View = VIEWS[key]
    return View ? <View {...viewProps} /> : <Skeleton className="h-56 rounded-lg" />
  }

  // Queue › Match editing and generation: the sheets live here so Edit works from the Session tab
  // too, and a save, an accepted suggestion or an auto queue run switches the console to the Queue
  // tab. Regenerate (RegenerateQueue) stays on the Queue tab, where its button lives.
  const matchEditing = {
    onAddMatch: () => setMatchSheet({ mode: 'add' }),
    onEditMatch: (matchId: string) => setMatchSheet({ mode: 'edit', matchId }),
  }
  // Queue › Match control: Review and start (with its court), Start on a queue card (first free
  // court) and Pick another open the StartMatch sheets; no match starts without that confirmation.
  const onStartMatch = (matchId: string, courtId?: string) =>
    setMatchSheet({ mode: 'start', matchId, courtId })
  const onPickAnother = (courtId: string) => setMatchSheet({ mode: 'choose', courtId })
  const showQueue = () => setView(VIEWS.queue ? 'queue' : 'session')

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
      {online ? null : <Notice tone="offline">{OFFLINE_NOTICE}</Notice>}
      <Tabs
        aria-label="Console views"
        value={view}
        onChange={(value) => setView(value as ConsoleView)}
        items={tabs}
      >
        <TabsContent value="session" className="flex flex-col gap-5">
          <SessionView
            {...viewProps}
            onAddCourt={() => setSheet('add-court')}
            {...matchEditing}
            onOpenMatch={(matchId) => setMatchSheet({ mode: 'active', matchId })}
            onStartMatch={onStartMatch}
            onPickAnother={onPickAnother}
          />
        </TabsContent>
        <TabsContent value="queue">
          {VIEWS.queue ? (
            <QueueView
              {...viewProps}
              {...matchEditing}
              onStartMatch={onStartMatch}
              onSuggest={() => setMatchSheet({ mode: 'suggest' })}
              onAutoQueue={() => setMatchSheet({ mode: 'auto' })}
              onRegenerate={() => setMatchSheet({ mode: 'regenerate' })}
            />
          ) : (
            panel('queue')
          )}
        </TabsContent>
        <TabsContent value="players">{panel('players')}</TabsContent>
        <TabsContent value="leaderboard">{panel('leaderboard')}</TabsContent>
      </Tabs>
      <ConsoleFooterBar
        gamesRecorded={recorded}
        inPlay={active.length}
        waiting={waiting.length}
        online={online}
        onSessionDone={onSessionDone}
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
      <MatchLineup
        sessionId={sessionId}
        now={now}
        request={
          matchSheet && (matchSheet.mode === 'add' || matchSheet.mode === 'edit')
            ? matchSheet
            : null
        }
        onClose={() => setMatchSheet(null)}
        onSaved={showQueue}
      />
      <SuggestMatch
        sessionId={sessionId}
        open={matchSheet?.mode === 'suggest'}
        onOpenChange={(open) => setMatchSheet(open ? { mode: 'suggest' } : null)}
        onEditThenAdd={(lineup) => setMatchSheet({ mode: 'add', lineup })}
        onAdded={showQueue}
      />
      <AutoQueue
        sessionId={sessionId}
        open={matchSheet?.mode === 'auto'}
        onOpenChange={(open) => setMatchSheet(open ? { mode: 'auto' } : null)}
        onAdded={showQueue}
      />
      <RegenerateQueue
        sessionId={sessionId}
        open={matchSheet?.mode === 'regenerate'}
        onOpenChange={(open) => setMatchSheet(open ? { mode: 'regenerate' } : null)}
      />
      <ActiveMatch
        sessionId={sessionId}
        now={now}
        matchId={matchSheet?.mode === 'active' ? matchSheet.matchId : null}
        onClose={() => setMatchSheet(null)}
      />
      <StartMatch
        sessionId={sessionId}
        request={
          matchSheet && (matchSheet.mode === 'start' || matchSheet.mode === 'choose')
            ? matchSheet
            : null
        }
        onRequestChange={setMatchSheet}
        onClose={() => setMatchSheet(null)}
      />
      <PlayerProfile clubPlayerId={profileId} onClose={() => setProfileId(null)} />
      <SessionDoneFlow
        sessionId={sessionId}
        open={sheet === 'session-done'}
        onOpenChange={(open) => setSheet(open ? 'session-done' : null)}
      />
    </main>
  )
}
