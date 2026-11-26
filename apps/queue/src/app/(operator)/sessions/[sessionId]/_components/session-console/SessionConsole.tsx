'use client'

import { useConnectivity } from '@rotra/data/connectivity/useConnectivity'
import {
  activeMatches,
  courtMatches,
  freeCourts,
  matchStatus,
  queueMasterName,
  waitingMatches,
} from '@rotra/data/match/match.rules'
import { useLiveStandings } from '@rotra/data/match/useLiveStandings'
import { useSessionMatches } from '@rotra/data/match/useSessionMatches'
import { isPermissionRefusal } from '@rotra/data/mock/errors'
import { backToPreparationBlocker } from '@rotra/data/queue-session/queueSession.rules'
import { recordsGames, sessionScoring } from '@rotra/data/queue-session/types'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import { isRealDataMode } from '@rotra/data/real/mode'
import { flushSessionPresence } from '@rotra/data/session-roster/flushSessionPresence'
import { flushSessionRoster } from '@rotra/data/session-roster/flushSessionRoster'
import { useSessionRoster } from '@rotra/data/session-roster/useSessionRoster'
import { SCORING } from '@rotra/schema/scoring'
import { Button } from '@rotra/ui/button'
import { Chip } from '@rotra/ui/chip'
import { ConsoleFooterBar } from '@rotra/ui/console-footer-bar'
import { ConsoleHeaderActions } from '@rotra/ui/console-header-actions'
import { Icon } from '@rotra/ui/icon'
import { NotRankedChip } from '@rotra/ui/not-ranked-chip'
import { Notice } from '@rotra/ui/notice'
import { formatWhen } from '@rotra/ui/now-card/helpers'
import { OverdueBanner, sessionEndStatus } from '@rotra/ui/overdue-banner'
import { PageHeader } from '@rotra/ui/page-header'
import { SessionTitleLink } from '@rotra/ui/session-title-link'
import { FreeCourtSheet } from '@rotra/ui/free-court-sheet'
import { Sheet } from '@rotra/ui/sheet'
import { Skeleton } from '@rotra/ui/skeleton'
import { type TabItem, Tabs, TabsContent } from '@rotra/ui/tabs'
import { notFound, usePathname, useRouter, useSearchParams } from 'next/navigation'
import { type ComponentType, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDockAction } from '@/app/(operator)/_components/operator-shell/DockAction.context'
import { QueryError } from '@/app/(operator)/_components/query-error/QueryError'
import { ActiveMatch } from '@/app/(operator)/sessions/[sessionId]/_components/active-match/ActiveMatch'
import { BackToPreparation } from '@/app/(operator)/sessions/[sessionId]/_components/back-to-preparation/BackToPreparation'
import { CourtsAndTime } from '@/app/(operator)/sessions/[sessionId]/_components/courts-and-time/CourtsAndTime'
import { FacebookPost } from '@/app/(operator)/sessions/[sessionId]/_components/facebook-post/FacebookPost'
import { GenerateQueueView } from '@/app/(operator)/sessions/[sessionId]/_components/generate-queue-view/GenerateQueueView'
import { HistoryView } from '@/app/(operator)/sessions/[sessionId]/_components/history-view/HistoryView'
import { JoinRequests } from '@/app/(operator)/sessions/[sessionId]/_components/join-requests/JoinRequests'
import { LeaderboardView } from '@/app/(operator)/sessions/[sessionId]/_components/leaderboard-view/LeaderboardView'
import {
  MatchLineup,
  type MatchLineupRequest,
} from '@/app/(operator)/sessions/[sessionId]/_components/match-lineup/MatchLineup'
import { PaymentsPanel } from '@/app/(operator)/sessions/[sessionId]/_components/payments-panel/PaymentsPanel'
import { PlayerGamesProvider } from '@/app/(operator)/sessions/[sessionId]/_components/player-games/PlayerGames'
import { PlayerProfile } from '@/app/(operator)/sessions/[sessionId]/_components/player-profile/PlayerProfile'
import { PlayersView } from '@/app/(operator)/sessions/[sessionId]/_components/players-view/PlayersView'
import { QueueView } from '@/app/(operator)/sessions/[sessionId]/_components/queue-view/QueueView'
import { SessionDoneFlow } from '@/app/(operator)/sessions/[sessionId]/_components/session-done-flow/SessionDoneFlow'
import { SessionView } from '@/app/(operator)/sessions/[sessionId]/_components/session-view/SessionView'
import { SettingsView } from '@/app/(operator)/sessions/[sessionId]/_components/settings-view/SettingsView'
import { ShareSession } from '@/app/(operator)/sessions/[sessionId]/_components/share-session/ShareSession'
import {
  StartMatch,
  type StartMatchRequest,
} from '@/app/(operator)/sessions/[sessionId]/_components/start-match/StartMatch'
import { SuggestMatch } from '@/app/(operator)/sessions/[sessionId]/_components/suggest-match/SuggestMatch'
import { sessionHref } from '@/lib/dates'
import { useNow } from '@/lib/useNow'
import { ConsoleDeviceNotice } from '../console-device-notice/ConsoleDeviceNotice'

export type SessionConsoleProps = { sessionId: string; resumeSessionDone?: boolean }

/**
 * The console's tabs, in display order: Courts, Main Queue, Generate Queue, Players, Leaderboard,
 * Match History, Settings.
 */
export type ConsoleView =
  | 'courts'
  | 'queue'
  | 'generate'
  | 'players'
  | 'leaderboard'
  | 'history'
  | 'settings'

/** The `?tab=` value of each tab; Courts has none. */
const TAB_PARAMS: Record<ConsoleView, string | null> = {
  courts: null,
  queue: 'queue',
  generate: 'generate',
  players: 'roster',
  leaderboard: 'board',
  history: 'history',
  settings: 'settings',
}

/** Values older links may carry, mapped to the nearest tab (Payments is a button on Settings now). */
const LEGACY_TAB_PARAMS: Record<string, ConsoleView> = {
  session: 'courts',
  players: 'players',
  leaderboard: 'leaderboard',
  payments: 'settings',
}

const tabFromParam = (param: string | null): ConsoleView =>
  (Object.keys(TAB_PARAMS) as ConsoleView[]).find((view) => TAB_PARAMS[view] === param) ??
  (param ? LEGACY_TAB_PARAMS[param] : undefined) ??
  'courts'
export type ConsoleSheet =
  | 'join-requests'
  | 'payments'
  | 'post'
  | 'adjust'
  | 'add-court'
  | 'session-done'
  | 'back-to-prep'
  | null
/** The Queue › Match editing and generation sheets: Add match / Edit lineup, Suggested match, Auto queue */
export type MatchSheet =
  | MatchLineupRequest
  | { mode: 'suggest' }
  /** A free court's picture: Court N is free (Pick from the queue, Generate a match) */
  | { mode: 'free'; courtId: string }
  /** Open match on an in-game court card: the active match sheet (Queue › Match control) */
  | { mode: 'active'; matchId: string; move?: { courtId?: string }; result?: boolean }
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

// Real data mode has no device copy that saves changes yet, so the mock text above would be untrue.
const OFFLINE_NOTICE_REAL =
  'Working offline. This device shows the last session data it loaded; changes need an internet connection until you reconnect. Session done needs internet.'

/**
 * The views other tickets add, one container file each; the shell shows a view's tab and panel as
 * soon as it is listed here; an unlisted Queue hides its tab, while unlisted Players and
 * Leaderboard keep their tab and a Skeleton panel. Courts (SessionView) and Settings (SettingsView)
 * take extra callbacks and are rendered by the shell.
 */
const VIEWS: Partial<
  Record<Exclude<ConsoleView, 'courts' | 'settings'>, ComponentType<ConsoleViewProps>>
> = {
  queue: QueueView,
  generate: GenerateQueueView,
  players: PlayersView,
  leaderboard: LeaderboardView,
  history: HistoryView,
}

const MODE_LABELS = { chill: 'Chill', fair: 'Fair', hard: 'Hard' } as const

/**
 * Q-CONSOLE: the live session shell. Header with the mode, formats and minimum chips and, at the
 * upper right, ConsoleHeaderActions: Match requests · N (the Requests sheet, match requests only),
 * Share (the Share this session dialog), Courts and time, Payments and the More menu (Public page, Copy Facebook post, Home). Then the
 * view tabs (Courts, Main Queue, Generate Queue, Players, Leaderboard, Match History, Settings; on phones one
 * "Console view" menu) with live counts, the view panels (Courts here; the others arrive in their
 * own containers), the selected tab in the URL (`?tab=`), the
 * ConsoleFooterBar and the dock's Session done pill. Sessions that are not live go to their own
 * screen: prepared to /preparation, finalizing to /finishing, finished or invalid to /record,
 * unknown ids to notFound().
 *
 * States: offline shows the warn notice and disables Session done in the footer and the dock (every
 * other action still works and its toast says "Saved on this device, waiting to sync"); the console
 * clock ticks every 30 s unless a sheet is open, a field has focus or a card is being dragged, and
 * each tick refetches the session so one finalized or invalidated elsewhere redirects to its record.
 */
export function SessionConsole({ sessionId, resumeSessionDone }: SessionConsoleProps) {
  const router = useRouter()
  const session = useQueueSession(sessionId)
  const roster = useSessionRoster(sessionId)
  const matches = useSessionMatches(sessionId)
  const standings = useLiveStandings(sessionId)
  // The selected tab lives in the URL (?tab=); missing or unknown values mean Courts.
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const [sheet, setSheet] = useState<ConsoleSheet>(resumeSessionDone ? 'session-done' : null)
  const [matchSheet, setMatchSheet] = useState<MatchSheet | null>(null)
  // Stacked dialogs: the dialogs this one was opened from, oldest first. × / Escape / the scrim / Back
  // pop one level; finishing the task (Put on court, Add to queue, Save lineup) clears them all.
  const [matchBack, setMatchBack] = useState<MatchSheet[]>([])
  const [profileId, setProfileId] = useState<string | null>(null)
  // The header Share button's Share this session dialog
  const [shareOpen, setShareOpen] = useState(false)
  const [editCourtId, setEditCourtId] = useState<string | null>(null)
  // Courts and time opened from the overdue banner focuses the New end picker
  const [focusEnd, setFocusEnd] = useState(false)

  const s = session.data
  // Record games off: the night runs and records as usual; a Not ranked chip in the header.
  const notRanked = s ? !recordsGames(s) : false
  const view: ConsoleView = tabFromParam(tabParam)
  const setView = useCallback(
    (next: ConsoleView) => {
      const params = new URLSearchParams(searchParams.toString())
      const value = TAB_PARAMS[next]
      if (value) params.set('tab', value)
      else params.delete('tab')
      const query = params.toString()
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams],
  )
  if (session.isError && isPermissionRefusal(session.error)) notFound()
  const redirectTo = s && s.state !== 'active' ? sessionHref(s) : null
  useEffect(() => {
    if (redirectTo) router.replace(redirectTo)
  }, [redirectTo, router])

  // Court boundaries update during sheets; session data still refetches every 30 seconds.
  const now = useNow(1000, false, true)
  const lastSessionRefresh = useRef(Date.now())
  const refetchSession = session.refetch
  const firstTick = useRef(true)
  useEffect(() => {
    if (firstTick.current) {
      firstTick.current = false
      return
    }
    if (now - lastSessionRefresh.current < 30_000) return
    lastSessionRefresh.current = now
    void refetchSession()
  }, [now, refetchSession])

  // Online: the browser's connection, or the DevMenu's Simulate offline toggle.
  const { online } = useConnectivity()

  // Session done opens the three-step sheet from the footer button and the dock pill alike; offline
  // both are disabled.
  const onSessionDone = useCallback(async () => {
    await flushSessionRoster(sessionId)
    await flushSessionPresence(sessionId)
    setSheet('session-done')
  }, [sessionId])
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

  const endStatus = s ? sessionEndStatus(s.scheduledEndAt, now) : null
  const rosterList = roster.data?.roster ?? []
  const courts = s?.courts ?? []
  const all = matches.data ?? []
  const ctx = { roster: rosterList, matches: all, courts, now }
  const waiting = waitingMatches(all)
  const active = activeMatches(all)
  const recorded = all.filter((m) => m.state === 'completed').length
  // The Match History tab's "N played": finished matches, invalid ones included (the prototype's count).
  const played = all.filter((m) => m.state === 'completed' || m.state === 'invalid').length
  // The Courts chip (owner, November 26, 2026): Vacant N in warn while N open courts are free,
  // N/N full in the accent when none are. N counts courts held by a Getting ready or Playing match.
  const vacant = freeCourts(courts, all, now).length
  const held = courtMatches(all).reduce((n, m) => n + m.courtIds.length, 0)
  const attention = waiting.filter((m) => matchStatus(m, ctx).kind === 'needs-attention').length
  const present = rosterList.filter((p) => p.present).length
  // Match requests · N: open match requests, carried by the live session read. Join requests close
  // at Start, so none count here; real mode has no Requests read yet and shows 0.
  const matchRequestCount = s?.requestCount ?? 0
  // The top position: one leader ("NAME leads") or the players sharing it ("3 tied").
  const leaders = (standings.data ?? []).filter((r) => r.position === 1)
  const leader = leaders[0]
  const leaderPlayer = leader ? rosterList.find((p) => p.id === leader.playerId) : undefined
  const formats =
    [s?.allowSingles && 'Singles', s?.allowDoubles && 'Doubles'].filter(Boolean).join(' + ') ||
    'No standard format'

  const tabs: TabItem[] = [
    {
      value: 'courts',
      label: 'Courts',
      badges: [
        vacant
          ? { text: `Vacant ${vacant}`, tone: 'warn' as const }
          : { text: `${held}/${courts.length} full`, tone: 'accent' as const },
      ],
    },
    ...(VIEWS.queue
      ? [
          {
            value: 'queue',
            label: 'Main Queue',
            badges: [
              { text: String(waiting.length), longText: ' waiting' },
              ...(attention
                ? [{ text: String(attention), longText: ' need attention', tone: 'warn' as const }]
                : []),
            ],
          },
        ]
      : []),
    ...(VIEWS.generate ? [{ value: 'generate', label: 'Generate Queue' }] : []),
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
        ? [
            {
              text:
                leaders.length > 1
                  ? `${leaders.length} tied`
                  : `${leaderPlayer ? queueMasterName(leaderPlayer) : leader.name} leads`,
            },
          ]
        : [],
    },
    ...(!VIEWS.history
      ? []
      : [
          {
            value: 'history',
            label: 'Match History',
            badges: [{ text: String(played), longText: ' played' }],
          },
        ]),
    { value: 'settings', label: 'Settings' },
  ]

  const viewProps: ConsoleViewProps = {
    sessionId,
    now,
    onOpenProfile: setProfileId,
    onOpenQueue: () => setView(VIEWS.queue ? 'queue' : 'courts'),
  }
  const panel = (key: Exclude<ConsoleView, 'courts' | 'settings'>) => {
    const View = VIEWS[key]
    return View ? <View {...viewProps} /> : <Skeleton className="h-56 rounded-lg" />
  }

  // Queue › Match editing and generation: the sheets live here so Edit works from the Session tab
  // too, and a save, an accepted suggestion or an auto queue run switches the console to the Queue
  // tab.
  /** Opens a first dialog: nothing underneath it, so its × closes everything */
  const openMatchSheet = (next: MatchSheet) => {
    setMatchBack([])
    setMatchSheet(next)
  }
  /** Opens a dialog over the current one, which its × / Escape / scrim / Back return to */
  const pushMatchSheet = (next: MatchSheet) => {
    setMatchBack((stack) => (matchSheet ? [...stack, matchSheet] : stack))
    setMatchSheet(next)
  }
  /** One level back, or closed when this was the first dialog */
  const backMatchSheet = () => {
    setMatchSheet(matchBack.at(-1) ?? null)
    setMatchBack((stack) => stack.slice(0, -1))
  }
  /** The task is finished: close the whole stack */
  const closeMatchSheets = () => {
    setMatchSheet(null)
    setMatchBack([])
  }
  const matchEditing = {
    onAddMatch: () => openMatchSheet({ mode: 'add' }),
    // Edit on a card in Put a match on Court N opens over it; closing the editor returns there.
    onEditMatch: (matchId: string) =>
      matchSheet?.mode === 'choose'
        ? pushMatchSheet({ mode: 'edit', matchId })
        : openMatchSheet({ mode: 'edit', matchId }),
  }
  // Queue › Match control: Review and start (with its court), Start on a queue card (first free
  // court) and Pick another open the StartMatch sheets; no match starts without that confirmation.
  const onStartMatch = (matchId: string, courtId?: string) =>
    openMatchSheet({ mode: 'start', matchId, courtId })
  const onPickAnother = (courtId: string) => openMatchSheet({ mode: 'choose', courtId })
  const freeCourtId = matchSheet?.mode === 'free' ? matchSheet.courtId : null
  const showQueue = () => setView(VIEWS.queue ? 'queue' : 'courts')

  if (session.isError)
    return (
      <main className="px-page pt-5">
        <QueryError query={session} title="Couldn't load this session." />
      </main>
    )

  return (
    <PlayerGamesProvider sessionId={sessionId}>
      <main className="flex flex-col gap-5 px-page pt-5 pb-[170px]">
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
                <Chip>Scoring · {SCORING[sessionScoring(s)].label}</Chip>
                {notRanked ? <NotRankedChip /> : null}
              </span>
            }
            // 2026-11-13-queue-session-title-link: the title opens the public page in a new tab.
            title={<SessionTitleLink title={s.title} href={`/sessions/${sessionId}/public-page`} />}
            description={
              <>
                {s.venueName} · Started {formatWhen(s.startedAt ?? s.scheduledStartAt, now)} · Ends{' '}
                {formatWhen(s.scheduledEndAt, now)} ·{' '}
                {endStatus?.over ? (
                  <span className="text-warn">{endStatus.text}</span>
                ) : (
                  endStatus?.text
                )}
              </>
            }
            actions={
              <div className="flex flex-none flex-wrap items-center justify-end gap-2">
                <Button size="sm" onClick={() => setShareOpen(true)}>
                  <Icon name="share" />
                  Share
                </Button>
                <ConsoleHeaderActions
                  matchRequestCount={matchRequestCount}
                  onOpenMatchRequests={() => setSheet('join-requests')}
                  onOpenCourtsAndTime={() => {
                    setFocusEnd(false)
                    setSheet('adjust')
                  }}
                  onOpenPayments={() => setSheet('payments')}
                  onOpenPublicPage={() => router.push(`/sessions/${sessionId}/public-page`)}
                  onCopyFacebookPost={() => setSheet('post')}
                  onGoHome={() => router.push('/')}
                  onBackToPreparation={() => setSheet('back-to-prep')}
                  backToPreparationDisabledReason={backToPreparationBlocker(all, online)}
                />
              </div>
            }
          />
        ) : (
          <div className="flex flex-col gap-2">
            <Skeleton className="w-24" />
            <Skeleton className="h-8 w-64" />
            <Skeleton className="w-72" />
          </div>
        )}
        <ConsoleDeviceNotice sessionId={sessionId} />
        {s ? (
          <OverdueBanner
            endsAt={s.scheduledEndAt}
            now={now}
            offline={!online}
            onSetEndTime={() => {
              setFocusEnd(true)
              setSheet('adjust')
            }}
            onSessionDone={onSessionDone}
          />
        ) : null}
        {online ? null : (
          <Notice tone="offline">{isRealDataMode() ? OFFLINE_NOTICE_REAL : OFFLINE_NOTICE}</Notice>
        )}
        <Tabs
          phoneMenu
          aria-label="Console views"
          menuLabel="Console view"
          value={view}
          onChange={async (value) => {
            await flushSessionRoster(sessionId)
            await flushSessionPresence(sessionId)
            setView(value as ConsoleView)
          }}
          items={tabs}
        >
          <TabsContent value="courts" className="flex flex-col gap-5">
            <SessionView
              {...viewProps}
              onAddCourt={() => setSheet('add-court')}
              onEditCourt={(courtId) => {
                setEditCourtId(courtId)
                setSheet('add-court')
              }}
              {...matchEditing}
              onOpenMatch={(matchId, move) => openMatchSheet({ mode: 'active', matchId, move })}
              onMatchDone={(matchId) => openMatchSheet({ mode: 'active', matchId, result: true })}
              onStartMatch={onStartMatch}
              onPickAnother={onPickAnother}
              onFillCourt={(courtId) => openMatchSheet({ mode: 'free', courtId })}
            />
          </TabsContent>
          <TabsContent value="queue" className="flex flex-col gap-3">
            {VIEWS.queue ? (
              <QueueView
                {...viewProps}
                {...matchEditing}
                onStartMatch={onStartMatch}
                onSuggest={() => openMatchSheet({ mode: 'suggest' })}
                onOpenGenerate={() => setView('generate')}
              />
            ) : (
              panel('queue')
            )}
            {/* The Players picker under the Main Queue (owner, November 19, 2026): the same view as the
              Players tab, so matches are made while watching the queue. Only the active tab panel is
              mounted, so its sheets and state exist once; Make match adds to the queue right above and
              PlayersView never navigates. */}
            {VIEWS.players ? (
              <div className="border-t border-border pt-5">{panel('players')}</div>
            ) : null}
          </TabsContent>
          {VIEWS.generate ? (
            <TabsContent value="generate" forceMount className="data-[state=inactive]:hidden">
              {panel('generate')}
            </TabsContent>
          ) : null}
          <TabsContent value="players">{panel('players')}</TabsContent>
          <TabsContent value="leaderboard">{panel('leaderboard')}</TabsContent>
          <TabsContent value="history">{panel('history')}</TabsContent>
          <TabsContent value="settings">
            <SettingsView
              {...viewProps}
              onAddCourt={() => setSheet('add-court')}
              onOpenMatchRequests={() => setSheet('join-requests')}
              onOpenPayments={() => setSheet('payments')}
            />
          </TabsContent>
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
          title="Requests"
          wide
          footer={<Button onClick={() => setSheet(null)}>Done</Button>}
        >
          <JoinRequests sessionId={sessionId} variant="sheet" />
        </Sheet>
        <Sheet
          open={sheet === 'payments'}
          onOpenChange={(open) => setSheet(open ? 'payments' : null)}
          title="Payments"
          wide
          footer={<Button onClick={() => setSheet(null)}>Done</Button>}
        >
          <PaymentsPanel sessionId={sessionId} asSheet />
        </Sheet>
        <ShareSession sessionId={sessionId} open={shareOpen} onOpenChange={setShareOpen} />
        {s ? (
          <BackToPreparation
            session={s}
            matches={all}
            online={online}
            open={sheet === 'back-to-prep'}
            onOpenChange={(open) => setSheet(open ? 'back-to-prep' : null)}
          />
        ) : null}
        <FacebookPost
          sessionId={sessionId}
          open={sheet === 'post'}
          onOpenChange={(open) => setSheet(open ? 'post' : null)}
        />
        <CourtsAndTime
          sessionId={sessionId}
          open={sheet === 'adjust' || sheet === 'add-court' ? sheet : null}
          onOpenChange={(next) => {
            if (!next) setEditCourtId(null)
            setSheet(next)
          }}
          editCourtId={editCourtId}
          focusEnd={focusEnd}
          now={now}
        />
        <MatchLineup
          sessionId={sessionId}
          now={now}
          request={
            matchSheet && (matchSheet.mode === 'add' || matchSheet.mode === 'edit')
              ? matchSheet
              : null
          }
          onClose={backMatchSheet}
          onSaved={() => {
            closeMatchSheets()
            showQueue()
          }}
        />
        <FreeCourtSheet
          open={freeCourtId !== null}
          onOpenChange={(open) => {
            if (!open) backMatchSheet()
          }}
          courtLabel={courts.find((c) => c.id === freeCourtId)?.label ?? 'Court'}
          waitingCount={waiting.length}
          onPick={() => freeCourtId && pushMatchSheet({ mode: 'choose', courtId: freeCourtId })}
          onGenerate={() => pushMatchSheet({ mode: 'suggest' })}
        />
        <SuggestMatch
          sessionId={sessionId}
          open={matchSheet?.mode === 'suggest'}
          now={now}
          onBack={backMatchSheet}
          onAdded={() => {
            closeMatchSheets()
            showQueue()
          }}
        />
        <ActiveMatch
          sessionId={sessionId}
          now={now}
          matchId={matchSheet?.mode === 'active' ? matchSheet.matchId : null}
          moveFirst={matchSheet?.mode === 'active' ? (matchSheet.move ?? null) : null}
          resultFirst={matchSheet?.mode === 'active' && !!matchSheet.result}
          onClose={closeMatchSheets}
        />
        <StartMatch
          sessionId={sessionId}
          request={
            matchSheet && (matchSheet.mode === 'start' || matchSheet.mode === 'choose')
              ? matchSheet
              : null
          }
          // A 5v5's Put on court opens over Put a match on Court N, so Back returns to it.
          onRequestChange={pushMatchSheet}
          onEditMatch={matchEditing.onEditMatch}
          onClose={backMatchSheet}
          onDone={closeMatchSheets}
        />
        <PlayerProfile clubPlayerId={profileId} onClose={() => setProfileId(null)} />
        <SessionDoneFlow
          sessionId={sessionId}
          open={sheet === 'session-done'}
          onOpenChange={(open) => setSheet(open ? 'session-done' : null)}
        />
      </main>
    </PlayerGamesProvider>
  )
}
