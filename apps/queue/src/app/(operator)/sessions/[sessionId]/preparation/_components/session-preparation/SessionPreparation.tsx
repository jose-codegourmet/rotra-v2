'use client'

import { useClub } from '@rotra/data/club'
import { useConnectivity } from '@rotra/data/connectivity/useConnectivity'
import { DEMO_CLUB_ID } from '@rotra/data/fixtures/clubs'
import { REQUEST_FORMAT_PILL } from '@rotra/data/match/matchRequestDecisions'
import { allowedRequestFormats } from '@rotra/data/match-request/rules'
import { isPermissionRefusal } from '@rotra/data/mock/errors'
import {
  estimateMinimum,
  sessionMinutes,
  startBlocker,
} from '@rotra/data/queue-session/queueSession.rules'
import { useCancelSession } from '@rotra/data/queue-session/useCancelSession'
import { useDeleteSession } from '@rotra/data/queue-session/useDeleteSession'
import { useDownloadSession } from '@rotra/data/queue-session/useDownloadSession'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import { useQueueSessions } from '@rotra/data/queue-session/useQueueSessions'
import { useStartSession } from '@rotra/data/queue-session/useStartSession'
import { useSessionCostEstimate } from '@rotra/data/session-cost/useSessionCostEstimate'
import { useSessionPayments } from '@rotra/data/session-payment/useSessionPayments'
import { flushSessionPresence } from '@rotra/data/session-roster/flushSessionPresence'
import { useSessionRoster } from '@rotra/data/session-roster/useSessionRoster'
import { useSetAcceptJoinRequests } from '@rotra/data/session-roster/useSetAcceptJoinRequests'
import { courtNextDay } from '@rotra/schema/court-window'
import { formatPeso } from '@rotra/schema/money'
import { Breadcrumb } from '@rotra/ui/breadcrumb'
import { Button } from '@rotra/ui/button'
import { CancelSessionSheet } from '@rotra/ui/cancel-session-sheet'
import { CostEstimateResult } from '@rotra/ui/cost-estimate-summary'
import { DeleteSessionSheet } from '@rotra/ui/delete-session-sheet'
import { DeviceDownloadCard } from '@rotra/ui/device-download-card'
import { formatMinutes } from '@rotra/ui/forms/session-setup-form/helpers'
import { Icon } from '@rotra/ui/icon'
import { IconButton } from '@rotra/ui/icon-button'
import { Notice } from '@rotra/ui/notice'
import { OverflowMenu, type OverflowMenuItem } from '@rotra/ui/overflow-menu'
import { PageHeader } from '@rotra/ui/page-header'
import { SessionJoinQr } from '@rotra/ui/session-join-qr'
import { SessionLinkCard } from '@rotra/ui/session-link-card'
import { SessionSetupCard } from '@rotra/ui/session-setup-card'
import { Sheet } from '@rotra/ui/sheet'
import { Skeleton } from '@rotra/ui/skeleton'
import { StartSessionBar } from '@rotra/ui/start-session-bar'
import { StartSessionSheet } from '@rotra/ui/start-session-sheet'
import { Tabs, TabsContent } from '@rotra/ui/tabs'
import { toast } from '@rotra/ui/toaster'
import Link from 'next/link'
import { notFound, usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { AddPlayer } from '@/app/(operator)/_components/add-player/AddPlayer'
import { useDockAction } from '@/app/(operator)/_components/operator-shell/DockAction.context'
import { QueryError } from '@/app/(operator)/_components/query-error/QueryError'
import { CourtsAndTime } from '@/app/(operator)/sessions/[sessionId]/_components/courts-and-time/CourtsAndTime'
import { FacebookPost } from '@/app/(operator)/sessions/[sessionId]/_components/facebook-post/FacebookPost'
import { JoinRequests } from '@/app/(operator)/sessions/[sessionId]/_components/join-requests/JoinRequests'
import { PaymentsPanel } from '@/app/(operator)/sessions/[sessionId]/_components/payments-panel/PaymentsPanel'
import { PreparationRoster } from '@/app/(operator)/sessions/[sessionId]/preparation/_components/preparation-roster/PreparationRoster'
import { sessionHref } from '@/lib/dates'
import { useAppSelector } from '@/store/hooks'
import { selectAccount } from '@/store/slices/authSlice'
import { selectDev } from '@/store/slices/devSlice'

const MODES = {
  chill: { label: 'Chill', text: 'Aims for roughly 30% easy games per player.' },
  fair: { label: 'Fair', text: 'Mainly level-matched games, roughly 10% easy games.' },
  hard: { label: 'Hard', text: 'Demanding runs, including 2–3 consecutive games.' },
} as const

const TABS = ['overview', 'roster', 'waitlist', 'payments'] as const
type PreparationTab = (typeof TABS)[number]

const time = (at: number) =>
  new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
const date = (at: number) =>
  new Date(at).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Try again.'

/**
 * Q-PREPARE: header, the Requests card while anything waits, tabs (Overview, Roster and levels,
 * Waitlist), Setup / This device / Session link cards, the Start bar and dialog. Active sessions
 * retain the read-only summary with the existing live sheets and a Continue session dock action.
 */
export function SessionPreparation({ sessionId }: { sessionId: string }) {
  const router = useRouter()
  const cost = useSessionCostEstimate(sessionId)
  const payments = useSessionPayments(sessionId)
  const dev = useAppSelector(selectDev)
  const offline = !useConnectivity().online
  const session = useQueueSession(sessionId)
  const clubId = useAppSelector(selectAccount)?.id ?? DEMO_CLUB_ID
  const club = useClub(clubId)
  const sessions = useQueueSessions()
  const roster = useSessionRoster(sessionId)
  const download = useDownloadSession()
  const start = useStartSession()
  const remove = useDeleteSession()
  const cancel = useCancelSession()
  const setAcceptJoinRequests = useSetAcceptJoinRequests()
  // The selected tab lives in the URL (?tab=); missing or unknown values fall back to Overview.
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const tab: PreparationTab = TABS.find((t) => t === tabParam) ?? 'overview'
  const setTab = (next: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', next)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }
  const [liveSheet, setLiveSheet] = useState<
    'adjust' | 'add-court' | 'add-player' | 'requests' | 'payments' | null
  >(null)
  const [startOpen, setStartOpen] = useState(false)
  const [postOpen, setPostOpen] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  // The public link is origin + /s/<publicSlug>; the origin is only known in the browser.
  const [origin, setOrigin] = useState('')
  useEffect(() => setOrigin(window.location.origin), [])

  const s = session.data
  const live = s?.state === 'active'
  // Once deleted, the session query fails while we leave for Home; that is not a 404.
  const deleted = remove.isSuccess
  if (!deleted && session.isError && isPermissionRefusal(session.error)) notFound()
  // Active sessions keep this summary; terminal/finalizing sessions use their existing landing page.
  const redirectTo = s && s.state !== 'prepared' && s.state !== 'active' ? sessionHref(s) : null
  useEffect(() => {
    if (redirectTo) router.replace(redirectTo)
  }, [redirectTo, router])

  const rosterList = roster.data?.roster ?? []
  const waitlist = roster.data?.waitlist ?? []
  const blocker =
    s && sessions.data
      ? startBlocker(s, {
          sessions: sessions.data,
          roster: rosterList,
          licenseExpired: dev.licenseExpired,
          offline: offline,
          downloaded: s.downloadState === 'ready',
        })
      : null
  const otherLive = sessions.data?.find((x) => x.state === 'active' && x.id !== sessionId)
  const present = rosterList.filter((p) => p.present).length
  const courts = s?.courts ?? []
  const minutes = s ? sessionMinutes(s.scheduledStartAt, s.scheduledEndAt) : 0
  const players =
    rosterList.length || s?.expectedPlayers || courts.length * (s?.playersPerCourt ?? 8)
  const est = s
    ? estimateMinimum({
        courts: courts.length,
        minutes,
        players,
        allowSingles: s.allowSingles,
        allowDoubles: s.allowDoubles,
      })
    : { low: 0, high: 0, usable: 1 }
  const formats =
    [s?.allowSingles && 'Singles', s?.allowDoubles && 'Doubles'].filter(Boolean).join(' + ') ||
    'No standard format'

  const openStart = useMemo(
    () => ({
      label: 'Start session',
      icon: 'nav-live' as const,
      disabled: Boolean(blocker) || !s,
      onClick: () => setStartOpen(true),
    }),
    [blocker, s],
  )
  const continueSession = useMemo(
    () => ({
      label: 'Continue session',
      icon: 'nav-live' as const,
      onClick: () => router.push(`/sessions/${sessionId}`),
    }),
    [router, sessionId],
  )
  useDockAction(live ? continueSession : s?.state === 'prepared' ? openStart : null)

  const confirmStart = (newEndAt?: number) =>
    start.mutate(newEndAt === undefined ? sessionId : { sessionId, newEndAt }, {
      onSuccess: (result) => {
        toast(result.message)
        router.push(`/sessions/${sessionId}`)
      },
    })

  const confirmDelete = () =>
    remove.mutate(sessionId, {
      onSuccess: (result) => {
        toast(result.message)
        router.replace('/')
      },
    })

  const confirmCancel = (reason: string) =>
    cancel.mutate(
      { sessionId, reason },
      {
        onSuccess: (result) => {
          toast(result.message)
          setCancelOpen(false)
          router.push(`/sessions/${sessionId}/record`)
        },
      },
    )

  const publicHref = s ? `/s/${s.publicSlug}` : '/'
  const sessionLink = `${origin}${publicHref}`
  // Requests · N: pending join requests + open drop-out notices + open match requests, carried by
  // the session read; real mode has no Requests read yet, so it counts the join requests alone.
  const pendingRequests = (roster.data?.joinRequests ?? []).filter(
    (r) => r.status === 'pending',
  ).length
  const requestCount = s?.requestCount ?? pendingRequests
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(sessionLink)
    } catch {
      // Clipboard unavailable (insecure context or denied): show the link so it can be copied by hand.
      toast.error(`Couldn't copy automatically. Copy this link: ${sessionLink}`)
      return
    }
    toast(
      s?.acceptJoinRequests === false
        ? 'Session link copied · joining is not open yet, guests are told to contact the Queue Master'
        : 'Session link copied',
    )
  }

  if (deleted || redirectTo) return null
  if (session.isError)
    return (
      <main className="px-page pt-5">
        <QueryError query={session} title="Couldn't load this session." />
      </main>
    )

  // Before start only, once the roster has loaded (both dialogs read it). Cancel first.
  const sessionMenu: OverflowMenuItem[] =
    s && !live && roster.data
      ? [
          ...(s.state === 'prepared'
            ? [
                {
                  label: 'Cancel session',
                  icon: 'ban' as const,
                  destructive: true,
                  onSelect: () => setCancelOpen(true),
                },
              ]
            : []),
          {
            label: 'Delete session',
            icon: 'trash' as const,
            destructive: true,
            onSelect: () => setDeleteOpen(true),
          },
        ]
      : []

  return (
    <main className="flex flex-col gap-5 px-page pt-5 pb-[170px]">
      <Breadcrumb label="Home" href="/" linkAs={Link} />
      {s ? (
        <PageHeader
          eyebrow={
            <span className="text-xs font-semibold tracking-[0.5px] text-fg2 uppercase">
              {live ? 'Session settings' : 'Preparation'}
            </span>
          }
          title={s.title}
          titleAction={
            <div className="flex items-center gap-1">
              <IconButton label="Open public page" variant="ghost" size="sm" asChild>
                <Link href={`/sessions/${sessionId}/public-page`}>
                  <Icon name="external" />
                </Link>
              </IconButton>
              {/* The session-ending actions, apart from the everyday ones (owner, November 10, 2026). */}
              {sessionMenu.length ? (
                <OverflowMenu label="More for this session" triggerSize="sm" items={sessionMenu} />
              ) : null}
            </div>
          }
          description={`${date(s.scheduledStartAt)} · ${time(s.scheduledStartAt)}–${time(s.scheduledEndAt)} · ${s.venueName}`}
          actions={
            <>
              <Button
                size="sm"
                asChild
                aria-label={live ? 'Back to live session' : 'Edit preparation'}
              >
                {live ? (
                  <Link href={`/sessions/${sessionId}`}>
                    <Icon name="back" />
                    <ActionLabel long="Back to live session" short="Live session" />
                  </Link>
                ) : (
                  <Link href={`/sessions/${sessionId}/edit`}>
                    <Icon name="edit" />
                    <ActionLabel long="Edit preparation" short="Edit" />
                  </Link>
                )}
              </Button>
              <Button size="sm" aria-label="Copy invite link" onClick={() => void copyLink()}>
                <Icon name="link" />
                <ActionLabel long="Copy invite link" short="Invite link" />
              </Button>
              <Button size="sm" onClick={() => setQrOpen(true)}>
                <Icon name="qr" />
                Session QR
              </Button>
              <Button size="sm" aria-label="Copy Facebook post" onClick={() => setPostOpen(true)}>
                <Icon name="megaphone" />
                <ActionLabel long="Copy Facebook post" short="Facebook post" />
              </Button>
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
      {live ? (
        <Notice>
          Preparation values are read-only during play. Mode, formats, minimum and playing levels
          are fixed after start. Use the live controls in Overview to manage courts, time, arrivals,
          requests and payments.
        </Notice>
      ) : (
        <JoinRequests sessionId={sessionId} />
      )}
      <Tabs
        phoneMenu
        aria-label={live ? 'Session settings section' : 'Preparation section'}
        value={tab}
        onChange={async (value) => {
          await flushSessionPresence(sessionId)
          setTab(value)
        }}
        items={[
          { value: 'overview', label: 'Overview' },
          {
            value: 'roster',
            label: 'Roster and levels',
            shortLabel: 'Roster',
            badges: [{ text: `${rosterList.length}/${courts.length * (s?.playersPerCourt ?? 8)}` }],
          },
          { value: 'waitlist', label: 'Waitlist', badges: [{ text: String(waitlist.length) }] },
          {
            value: 'payments',
            label: 'Payments',
            badges: payments.data
              ? [
                  {
                    text: `${payments.data.totals.paid}/${payments.data.totals.total}`,
                    longText: ' paid',
                  },
                ]
              : [],
          },
        ]}
      >
        <TabsContent value="overview">
          {s && roster.data ? (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-4">
                <SessionSetupCard
                  requestFormatLabels={allowedRequestFormats(s).map(
                    (format) => REQUEST_FORMAT_PILL[format],
                  )}
                  extraRows={[
                    ...(cost.data
                      ? [
                          {
                            label: 'Costs',
                            value: (
                              <>
                                {formatPeso(cost.data.estimate.total)} estimated ·{' '}
                                {formatPeso(cost.data.estimate.breakEven)} a player to break even
                                <br />
                                Players pay {formatPeso(cost.data.estimate.perHead)} (
                                {cost.data.estimate.isCustom ? 'custom amount' : 'break-even'}) ·{' '}
                                <CostEstimateResult result={cost.data.estimate.result} />
                              </>
                            ),
                          },
                        ]
                      : []),
                    ...(live && s.notes ? [{ label: 'Notes', value: s.notes }] : []),
                  ]}
                  fixedAfterStart={live}
                  actions={
                    live ? (
                      <>
                        <Button size="sm" onClick={() => setLiveSheet('adjust')}>
                          Courts and time
                        </Button>
                        <Button size="sm" onClick={() => setLiveSheet('add-player')}>
                          Add player
                        </Button>
                        <Button size="sm" onClick={() => setLiveSheet('requests')}>
                          Requests · {requestCount}
                        </Button>
                        <Button size="sm" onClick={() => setLiveSheet('payments')}>
                          Payments
                        </Button>
                      </>
                    ) : undefined
                  }
                  courtLabels={courts.map((c) => {
                    if (!live) return c.label
                    const windowTime = (at: number) =>
                      `${time(at)}${courtNextDay(at, s.scheduledStartAt) ? ' · next day' : ''}`
                    return `${c.label} · ${windowTime(c.startsAt ?? s.startedAt ?? s.scheduledStartAt)}–${windowTime(c.openUntil ?? s.scheduledEndAt)} · ${c.openUntil === null ? 'follows session end' : 'set time'}`
                  })}
                  formatsLabel={formats}
                  modeLabel={MODES[s.sessionMode].label}
                  modeDescription={MODES[s.sessionMode].text}
                  minimumGames={s.minimumGames}
                  minimum={
                    s.minimumIsCalculated
                      ? {
                          kind: 'calculated',
                          players,
                          usableCourts: est.usable,
                          durationLabel: formatMinutes(minutes),
                          low: est.low,
                          high: est.high,
                        }
                      : { kind: 'set', low: est.low, high: est.high }
                  }
                  rosterCount={rosterList.length}
                  presentCount={present}
                />
                {!live ? (
                  <DeviceDownloadCard
                    state={download.isPending ? 'downloading' : s.downloadState}
                    offline={offline}
                    snapshotAge={
                      s.downloadError && s.downloadState === 'ready'
                        ? s.downloadedAt
                          ? `copy from ${new Date(s.downloadedAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' })}`
                          : 'the copy from before this update'
                        : undefined
                    }
                    error={s.downloadError ?? download.error?.message}
                    onDownload={() =>
                      download.mutate(sessionId, {
                        onSuccess: (result) => toast(result.message),
                        onError: (error) => toast.error(errorMessage(error)),
                      })
                    }
                  />
                ) : null}
              </div>
              {cost.isError ? (
                <QueryError query={cost} title="Couldn't load the cost estimate." />
              ) : null}
              <SessionLinkCard
                link={sessionLink}
                pendingCount={pendingRequests}
                acceptJoinRequests={s.acceptJoinRequests}
                onCopyLink={() => void copyLink()}
                onOpenAsGuest={() => router.push(publicHref)}
                onPreviewPublicPage={() => router.push(`/sessions/${sessionId}/public-page`)}
                onAcceptJoinRequestsChange={(accept) =>
                  setAcceptJoinRequests.mutate(
                    { sessionId, accept },
                    {
                      onSuccess: (result) => toast(result.message),
                      onError: (error) => toast.error(errorMessage(error)),
                    },
                  )
                }
              />
            </div>
          ) : roster.isError ? (
            <QueryError query={roster} title="Couldn't load the roster." />
          ) : (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-4">
              <Skeleton className="h-56 rounded-lg" />
              <Skeleton className="h-40 rounded-lg" />
            </div>
          )}
        </TabsContent>
        <TabsContent value="roster">
          <PreparationRoster sessionId={sessionId} tab="roster" />
        </TabsContent>
        <TabsContent value="payments">
          <PaymentsPanel sessionId={sessionId} />
        </TabsContent>
        <TabsContent value="waitlist">
          <PreparationRoster sessionId={sessionId} tab="waitlist" />
        </TabsContent>
      </Tabs>
      {s?.state === 'prepared' ? (
        <StartSessionBar
          blocker={blocker}
          otherLive={
            otherLive && blocker?.startsWith(otherLive.title)
              ? { title: otherLive.title, onOpen: () => router.push(`/sessions/${otherLive.id}`) }
              : undefined
          }
          rosterCount={rosterList.length}
          presentCount={present}
          onStart={() => setStartOpen(true)}
        />
      ) : null}
      {s ? (
        <Sheet open={qrOpen} onOpenChange={setQrOpen} title="Session QR">
          {/* The QR holds the visitor link (/s/<slug>), never the public-page preview URL. */}
          <SessionJoinQr
            link={sessionLink}
            slug={s.publicSlug}
            clubName={club.data?.name ?? 'ROTRA session'}
            clubInitials={club.data?.initials}
            clubLogoUrl={club.data?.logoUrl}
            sessionTitle={s.title}
            dateLabel={date(s.scheduledStartAt)}
            timeLabel={`${time(s.scheduledStartAt)}–${time(s.scheduledEndAt)}`}
            venueName={s.venueName}
            onDownloaded={() => toast('QR image downloaded')}
            onError={(message) => toast.error(message)}
          />
        </Sheet>
      ) : null}
      {s?.state === 'prepared' ? (
        <StartSessionSheet
          open={startOpen}
          onOpenChange={(open) => {
            if (!open) start.reset()
            setStartOpen(open)
          }}
          title={s.title}
          courts={courts.length}
          formatsLabel={formats}
          modeLabel={MODES[s.sessionMode].label}
          minimumGames={s.minimumGames}
          rosterCount={rosterList.length}
          presentCount={present}
          waitlistCount={waitlist.length}
          offline={offline}
          isPending={start.isPending}
          error={start.error ? errorMessage(start.error) : undefined}
          plannedStartAt={s.scheduledStartAt}
          plannedEndAt={s.scheduledEndAt}
          onConfirm={confirmStart}
        />
      ) : null}
      {s?.state === 'prepared' ? (
        <DeleteSessionSheet
          open={deleteOpen}
          onOpenChange={(open) => {
            if (!open) remove.reset()
            setDeleteOpen(open)
          }}
          title={s.title}
          whenLabel={`${date(s.scheduledStartAt)} · ${time(s.scheduledStartAt)}–${time(s.scheduledEndAt)}`}
          venueName={s.venueName}
          confirmedCount={rosterList.length}
          waitlistCount={waitlist.length}
          pendingRequestCount={pendingRequests}
          offline={offline}
          isPending={remove.isPending}
          error={remove.error ? errorMessage(remove.error) : undefined}
          onConfirm={confirmDelete}
          onOpenRoster={() => {
            setDeleteOpen(false)
            setTab('roster')
          }}
        />
      ) : null}
      {s?.state === 'prepared' ? (
        <CancelSessionSheet
          open={cancelOpen}
          onOpenChange={(open) => {
            if (!open) cancel.reset()
            setCancelOpen(open)
          }}
          title={s.title}
          whenLabel={`${date(s.scheduledStartAt)} · ${time(s.scheduledStartAt)}–${time(s.scheduledEndAt)}`}
          joinedCount={rosterList.length}
          waitlistCount={waitlist.length}
          paidCount={payments.data?.totals.paid ?? 0}
          isPending={cancel.isPending}
          error={cancel.error ? errorMessage(cancel.error) : undefined}
          onConfirm={confirmCancel}
        />
      ) : null}
      {live ? (
        <>
          <CourtsAndTime
            sessionId={sessionId}
            open={liveSheet === 'adjust' || liveSheet === 'add-court' ? liveSheet : null}
            onOpenChange={setLiveSheet}
          />
          <AddPlayer
            sessionId={sessionId}
            open={liveSheet === 'add-player'}
            onOpenChange={(open) => setLiveSheet(open ? 'add-player' : null)}
          />
          <Sheet
            open={liveSheet === 'requests' || liveSheet === 'payments'}
            onOpenChange={(open) => {
              if (!open) setLiveSheet(null)
            }}
            title={liveSheet === 'payments' ? 'Payments' : 'Requests'}
            wide
            footer={<Button onClick={() => setLiveSheet(null)}>Done</Button>}
          >
            {liveSheet === 'payments' ? (
              <PaymentsPanel sessionId={sessionId} />
            ) : (
              <JoinRequests sessionId={sessionId} variant="sheet" />
            )}
          </Sheet>
        </>
      ) : null}
      <FacebookPost sessionId={sessionId} open={postOpen} onOpenChange={setPostOpen} />
    </main>
  )
}

/** A header action's label: the full one, or the short one on phones (640 px and narrower). */
function ActionLabel({ long, short }: { long: string; short: string }) {
  return (
    <>
      <span className="max-[640px]:hidden">{long}</span>
      <span className="hidden max-[640px]:inline">{short}</span>
    </>
  )
}
