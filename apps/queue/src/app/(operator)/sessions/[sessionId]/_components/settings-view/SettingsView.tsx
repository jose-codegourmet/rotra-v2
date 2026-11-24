'use client'

import { REQUEST_FORMAT_PILL } from '@rotra/data/match/matchRequestDecisions'
import { allowedRequestFormats } from '@rotra/data/match-request/rules'
import { estimateMinimum, sessionMinutes } from '@rotra/data/queue-session/queueSession.rules'
import { recordsGames, sessionScoring } from '@rotra/data/queue-session/types'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import { useSessionCostEstimate } from '@rotra/data/session-cost/useSessionCostEstimate'
import { useSessionRoster } from '@rotra/data/session-roster/useSessionRoster'
import { useSetAcceptJoinRequests } from '@rotra/data/session-roster/useSetAcceptJoinRequests'
import { useSetAlwaysRequireRequest } from '@rotra/data/session-roster/useSetAlwaysRequireRequest'
import { courtNextDay } from '@rotra/schema/court-window'
import { formatPeso } from '@rotra/schema/money'
import { SCORING } from '@rotra/schema/scoring'
import { Button } from '@rotra/ui/button'
import { CostEstimateResult } from '@rotra/ui/cost-estimate-summary'
import { formatMinutes } from '@rotra/ui/forms/session-setup-form/helpers'
import { Icon } from '@rotra/ui/icon'
import { SessionLinkCard } from '@rotra/ui/session-link-card'
import { SessionSetupCard } from '@rotra/ui/session-setup-card'
import { Skeleton } from '@rotra/ui/skeleton'
import { toast } from '@rotra/ui/toaster'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AddPlayer } from '@/app/(operator)/_components/add-player/AddPlayer'
import { QueryError } from '@/app/(operator)/_components/query-error/QueryError'
import { SessionHosts } from '@/app/(operator)/sessions/[sessionId]/_components/session-hosts/SessionHosts'
import type { ConsoleViewProps } from '@/app/(operator)/sessions/[sessionId]/_components/session-console/SessionConsole'

export type SettingsViewProps = ConsoleViewProps & {
  /** Courts and time: opens the Courts and time sheet (Q-SESSION-ADJUST) */
  onOpenCourtsAndTime: () => void
  /** Match requests · N: opens the Requests sheet */
  onOpenMatchRequests: () => void
  /** Payments: opens the Payments sheet */
  onOpenPayments: () => void
}

const MODES = {
  chill: { label: 'Chill', text: 'Aims for roughly 30% easy games per player.' },
  fair: { label: 'Fair', text: 'Mainly level-matched games, roughly 10% easy games.' },
  hard: { label: 'Hard', text: 'Demanding runs, including 2–3 consecutive games.' },
} as const

const time = (at: number) =>
  new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Try again.'

/**
 * The console's Settings tab: the session settings in place (SessionSetupCard with the Courts and
 * time, Add player, Match requests and Payments buttons, then the session link card) and
 * "All session settings", which opens the read-only Q-PREPARE page.
 */
export function SettingsView({
  sessionId,
  onOpenCourtsAndTime,
  onOpenMatchRequests,
  onOpenPayments,
}: SettingsViewProps) {
  const router = useRouter()
  const session = useQueueSession(sessionId)
  const roster = useSessionRoster(sessionId)
  const cost = useSessionCostEstimate(sessionId)
  const setAcceptJoinRequests = useSetAcceptJoinRequests()
  const setAlwaysRequireRequest = useSetAlwaysRequireRequest()
  const [addPlayerOpen, setAddPlayerOpen] = useState(false)
  // The public link is origin + /s/<publicSlug>; the origin is only known in the browser.
  const [origin, setOrigin] = useState('')
  useEffect(() => setOrigin(window.location.origin), [])

  const s = session.data
  if (session.isError) return <QueryError query={session} title="Couldn't load this session." />
  if (roster.isError) return <QueryError query={roster} title="Couldn't load the roster." />
  if (!s || !roster.data)
    return (
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-4">
        <Skeleton className="h-56 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
      </div>
    )

  const rosterList = roster.data.roster
  const courts = s.courts
  const present = rosterList.filter((p) => p.present).length
  const minutes = sessionMinutes(s.scheduledStartAt, s.scheduledEndAt)
  const players = rosterList.length || s.expectedPlayers || courts.length * (s.playersPerCourt ?? 8)
  const est = estimateMinimum({
    courts: courts.length,
    minutes,
    players,
    allowSingles: s.allowSingles,
    allowDoubles: s.allowDoubles,
  })
  const formats =
    [s.allowSingles && 'Singles', s.allowDoubles && 'Doubles'].filter(Boolean).join(' + ') ||
    'No standard format'
  const publicHref = `/s/${s.publicSlug}`
  const sessionLink = `${origin}${publicHref}`
  const pendingRequests = roster.data.joinRequests.filter((r) => r.status === 'pending').length
  const requestCount = s.requestCount ?? pendingRequests
  const windowTime = (at: number) =>
    `${time(at)}${courtNextDay(at, s.scheduledStartAt) ? ' · next day' : ''}`
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(sessionLink)
    } catch {
      // Clipboard unavailable (insecure context or denied): show the link so it can be copied by hand.
      toast.error(`Couldn't copy automatically. Copy this link: ${sessionLink}`)
      return
    }
    toast(
      s.acceptJoinRequests === false
        ? 'Session link copied · joining is not open yet, guests are told to contact the Queue Master'
        : 'Session link copied',
    )
  }
  const options = {
    onSuccess: (result: { message: string }) => toast(result.message),
    onError: (error: unknown) => toast.error(errorMessage(error)),
  }

  return (
    <section aria-label="Settings" className="flex flex-col gap-4">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-4">
        <SessionSetupCard
          recordGames={recordsGames(s)}
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
            ...(s.notes ? [{ label: 'Notes', value: s.notes }] : []),
          ]}
          fixedAfterStart
          actions={
            <>
              <Button size="sm" onClick={onOpenCourtsAndTime}>
                Courts and time
              </Button>
              <Button size="sm" onClick={() => setAddPlayerOpen(true)}>
                Add player
              </Button>
              <Button
                size="sm"
                aria-label={`Match requests · ${requestCount}${requestCount ? ' waiting' : ''}`}
                onClick={onOpenMatchRequests}
              >
                Match requests · {requestCount}
              </Button>
              <Button size="sm" onClick={onOpenPayments}>
                Payments
              </Button>
            </>
          }
          courtLabels={courts.map(
            (c) =>
              `${c.label} · ${windowTime(c.startsAt ?? s.startedAt ?? s.scheduledStartAt)}–${windowTime(c.openUntil ?? s.scheduledEndAt)} · ${c.openUntil === null ? 'follows session end' : 'set time'}`,
          )}
          formatsLabel={formats}
          modeLabel={MODES[s.sessionMode].label}
          modeDescription={MODES[s.sessionMode].text}
          scoringLabel={SCORING[sessionScoring(s)].label}
          scoringDescription={SCORING[sessionScoring(s)].text}
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
      </div>
      {cost.isError ? <QueryError query={cost} title="Couldn't load the cost estimate." /> : null}
      <SessionHosts sessionId={sessionId} />
      <SessionLinkCard
        link={sessionLink}
        pendingCount={pendingRequests}
        acceptJoinRequests={s.acceptJoinRequests}
        alwaysRequireRequest={s.alwaysRequireRequest ?? false}
        onCopyLink={() => void copyLink()}
        onOpenAsGuest={() => router.push(publicHref)}
        onPreviewPublicPage={() => router.push(`/sessions/${sessionId}/public-page`)}
        onAcceptJoinRequestsChange={(accept) =>
          setAcceptJoinRequests.mutate({ sessionId, accept }, options)
        }
        onAlwaysRequireRequestChange={(always) =>
          setAlwaysRequireRequest.mutate({ sessionId, always }, options)
        }
      />
      <div>
        <Button size="sm" onClick={() => router.push(`/sessions/${sessionId}/preparation`)}>
          <Icon name="nav-gear" />
          All session settings
        </Button>
      </div>
      <AddPlayer sessionId={sessionId} open={addPlayerOpen} onOpenChange={setAddPlayerOpen} />
    </section>
  )
}
