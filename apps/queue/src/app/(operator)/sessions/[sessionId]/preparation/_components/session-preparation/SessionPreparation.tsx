'use client'

import { MockError } from '@rotra/data/mock/errors'
import {
  estimateMinimum,
  sessionMinutes,
  startBlocker,
} from '@rotra/data/queue-session/queueSession.rules'
import { useDownloadSession } from '@rotra/data/queue-session/useDownloadSession'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import { useQueueSessions } from '@rotra/data/queue-session/useQueueSessions'
import { useStartSession } from '@rotra/data/queue-session/useStartSession'
import { useSessionRoster } from '@rotra/data/session-roster/useSessionRoster'
import { Breadcrumb } from '@rotra/ui/breadcrumb'
import { Button } from '@rotra/ui/button'
import { DeviceDownloadCard } from '@rotra/ui/device-download-card'
import { formatMinutes } from '@rotra/ui/forms/session-setup-form/helpers'
import { PageHeader } from '@rotra/ui/page-header'
import { SessionSetupCard } from '@rotra/ui/session-setup-card'
import { Skeleton } from '@rotra/ui/skeleton'
import { StartSessionBar } from '@rotra/ui/start-session-bar'
import { StartSessionSheet } from '@rotra/ui/start-session-sheet'
import { Tabs, TabsContent } from '@rotra/ui/tabs'
import { toast } from '@rotra/ui/toaster'
import Link from 'next/link'
import { notFound, useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { useDockAction } from '@/app/(operator)/_components/operator-shell/DockAction.context'
import { QueryError } from '@/app/(operator)/_components/query-error/QueryError'
import { FacebookPost } from '@/app/(operator)/sessions/[sessionId]/_components/facebook-post/FacebookPost'
import { sessionHref } from '@/lib/dates'
import { useAppSelector } from '@/store/hooks'
import { selectDev } from '@/store/slices/devSlice'

const MODES = {
  chill: { label: 'Chill', text: 'Aims for roughly 30% easy games per player.' },
  fair: { label: 'Fair', text: 'Mainly level-matched games, roughly 10% easy games.' },
  hard: { label: 'Hard', text: 'Demanding runs, including 2–3 consecutive games.' },
} as const

const time = (at: number) =>
  new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
const date = (at: number) =>
  new Date(at).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Try again.'

/** Q-PREPARE: header, tabs (Overview this ticket), Setup and This device cards, the Start bar and dialog. */
export function SessionPreparation({ sessionId }: { sessionId: string }) {
  const router = useRouter()
  const dev = useAppSelector(selectDev)
  const session = useQueueSession(sessionId)
  const sessions = useQueueSessions()
  const roster = useSessionRoster(sessionId)
  const download = useDownloadSession()
  const start = useStartSession()
  const [tab, setTab] = useState('overview')
  const [startOpen, setStartOpen] = useState(false)
  const [postOpen, setPostOpen] = useState(false)

  const s = session.data
  if (session.isError && session.error instanceof MockError && session.error.kind === 'permission')
    notFound()
  if (s && s.state !== 'prepared') router.replace(sessionHref(s))

  const rosterList = roster.data?.roster ?? []
  const waitlist = roster.data?.waitlist ?? []
  const blocker =
    s && sessions.data
      ? startBlocker(s, {
          sessions: sessions.data,
          roster: rosterList,
          licenseExpired: dev.licenseExpired,
          offline: dev.offline,
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
  useDockAction(openStart)

  const confirmStart = () =>
    start.mutate(sessionId, {
      onSuccess: (result) => {
        toast(result.message)
        router.push(`/sessions/${sessionId}`)
      },
    })

  if (session.isError)
    return (
      <main className="mx-auto max-w-[1240px] px-4 pt-5">
        <QueryError query={session} title="Couldn't load this session." />
      </main>
    )

  return (
    <main className="mx-auto flex max-w-[1240px] flex-col gap-5 px-[max(16px,env(safe-area-inset-left,0px))] pt-5 pb-[170px]">
      <Breadcrumb label="Home" href="/" linkAs={Link} />
      {s ? (
        <PageHeader
          eyebrow={
            <span className="text-xs font-semibold tracking-[0.5px] text-fg2 uppercase">
              Preparation
            </span>
          }
          title={s.title}
          description={`${date(s.scheduledStartAt)} · ${time(s.scheduledStartAt)}–${time(s.scheduledEndAt)} · ${s.venueName}`}
          actions={
            <>
              <Button size="sm" asChild>
                <Link href={`/sessions/${sessionId}/edit`}>Edit preparation</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href={`/s/${s.publicSlug}`}>Preview public page</Link>
              </Button>
              <Button size="sm" onClick={() => setPostOpen(true)}>
                Copy Facebook post
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
      <Tabs
        aria-label="Preparation"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'overview', label: 'Overview' },
          {
            value: 'roster',
            label: 'Roster and levels',
            shortLabel: 'Roster',
            badges: [{ text: `${rosterList.length}/${courts.length * (s?.playersPerCourt ?? 8)}` }],
          },
          { value: 'waitlist', label: 'Waitlist', badges: [{ text: String(waitlist.length) }] },
        ]}
      >
        <TabsContent value="overview">
          {s && roster.data ? (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-4">
              <SessionSetupCard
                courtLabels={courts.map((c) => c.label)}
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
              <DeviceDownloadCard
                state={s.downloadState}
                offline={dev.offline}
                onDownload={() =>
                  download.mutate(sessionId, {
                    onSuccess: (result) => toast(result.message),
                    onError: (error) => toast.error(errorMessage(error)),
                  })
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
          <p className="m-0 text-[13px] text-fg2">
            Roster and levels arrive with Queue › Players and roster.
          </p>
        </TabsContent>
        <TabsContent value="waitlist">
          <p className="m-0 text-[13px] text-fg2">
            The waitlist arrives with Queue › Players and roster.
          </p>
        </TabsContent>
      </Tabs>
      {s ? (
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
          offline={dev.offline}
          isPending={start.isPending}
          error={start.error ? errorMessage(start.error) : undefined}
          onConfirm={confirmStart}
        />
      ) : null}
      <FacebookPost sessionId={sessionId} open={postOpen} onOpenChange={setPostOpen} />
    </main>
  )
}
