'use client'

import { REQUEST_FORMAT_PILL } from '@rotra/data/match/matchRequestDecisions'
import { courtOpen, queueMasterName } from '@rotra/data/match/match.rules'
import { useSessionMatches } from '@rotra/data/match/useSessionMatches'
import { allowedRequestFormats } from '@rotra/data/match-request/rules'
import { recordsGames, sessionScoring } from '@rotra/data/queue-session/types'
import { useExtendSession } from '@rotra/data/queue-session/useExtendSession'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import { useUpdateCourt } from '@rotra/data/queue-session/useUpdateCourt'
import { useSessionCostEstimate } from '@rotra/data/session-cost/useSessionCostEstimate'
import { useSessionRoster } from '@rotra/data/session-roster/useSessionRoster'
import { useSetAcceptJoinRequests } from '@rotra/data/session-roster/useSetAcceptJoinRequests'
import { useSetAlwaysRequireRequest } from '@rotra/data/session-roster/useSetAlwaysRequireRequest'
import { formatPeso } from '@rotra/schema/money'
import { SCORING } from '@rotra/schema/scoring'
import { Button } from '@rotra/ui/button'
import { CostEstimateResult } from '@rotra/ui/cost-estimate-summary'
import type { CourtPlayer } from '@rotra/ui/court-drawing'
import { Icon } from '@rotra/ui/icon'
import { SessionLinkCard } from '@rotra/ui/session-link-card'
import { SettingsCard } from '@rotra/ui/settings-card'
import { SettingsCourtsBox, type SettingsCourtsBoxCourt } from '@rotra/ui/settings-courts-box'
import { Skeleton } from '@rotra/ui/skeleton'
import { toast } from '@rotra/ui/toaster'
import { WhoCanJoinCard } from '@rotra/ui/who-can-join-card'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AddPlayer } from '@/app/(operator)/_components/add-player/AddPlayer'
import { QueryError } from '@/app/(operator)/_components/query-error/QueryError'
import type { ConsoleViewProps } from '@/app/(operator)/sessions/[sessionId]/_components/session-console/SessionConsole'
import { SessionHosts } from '@/app/(operator)/sessions/[sessionId]/_components/session-hosts/SessionHosts'

export type SettingsViewProps = ConsoleViewProps & {
  /** Add court (the Courts box's last tile): opens the existing Add a court sheet */
  onAddCourt: () => void
  /** Match requests · N: opens the Requests sheet */
  onOpenMatchRequests: () => void
  /** Payments (Costs card): opens the Payments sheet */
  onOpenPayments: () => void
}

export const MODES = {
  chill: { label: 'Chill', text: 'Aims for roughly 30% easy games per player.' },
  fair: { label: 'Fair', text: 'Mainly level-matched games, roughly 10% easy games.' },
  hard: { label: 'Hard', text: 'Demanding runs, including 2–3 consecutive games.' },
} as const

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Try again.'

/**
 * The console's Settings tab (the prototype's liveSettings()): the Setup heading with one help line
 * and "All session settings" (opens the read-only Q-PREPARE page), the Courts box (From, Until and
 * Follows session end on useUpdateCourt, Extend on useExtendSession, Add court), a 2x2 grid of cards
 * (Game rules | Players, Costs | Notes), the session hosts, then the Session link and Who can join
 * boxes. The Courts box and its cards toast their own saves; this view only toasts failures.
 */
export function SettingsView({
  sessionId,
  now,
  onAddCourt,
  onOpenMatchRequests,
  onOpenPayments,
}: SettingsViewProps) {
  const router = useRouter()
  const session = useQueueSession(sessionId)
  const roster = useSessionRoster(sessionId)
  const matches = useSessionMatches(sessionId)
  const cost = useSessionCostEstimate(sessionId)
  const updateCourt = useUpdateCourt()
  const extend = useExtendSession()
  const setAcceptJoinRequests = useSetAcceptJoinRequests()
  const setAlwaysRequireRequest = useSetAlwaysRequireRequest()
  const [addPlayerOpen, setAddPlayerOpen] = useState(false)
  // The public link is origin + /s/<publicSlug>; the origin is only known in the browser.
  const [origin, setOrigin] = useState('')
  useEffect(() => setOrigin(window.location.origin), [])

  const s = session.data
  if (session.isError) return <QueryError query={session} title="Couldn't load this session." />
  if (roster.isError) return <QueryError query={roster} title="Couldn't load the roster." />
  if (matches.isError) return <QueryError query={matches} title="Couldn't load the matches." />
  if (!s || !roster.data || !matches.data)
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-56 rounded-lg" />
        <div className="grid gap-4 min-[761px]:grid-cols-2">
          <Skeleton className="h-56 rounded-lg" />
          <Skeleton className="h-56 rounded-lg" />
        </div>
      </div>
    )

  const rosterList = roster.data.roster
  const courts = s.courts.filter((c) => !c.removedAt)
  const present = rosterList.filter((p) => p.present).length
  const formats =
    [s.allowSingles && 'Singles', s.allowDoubles && 'Doubles'].filter(Boolean).join(' + ') ||
    'No standard format'
  const requestFormats = allowedRequestFormats(s).map((format) => REQUEST_FORMAT_PILL[format])
  const publicHref = `/s/${s.publicSlug}`
  const sessionLink = `${origin}${publicHref}`
  const pendingRequests = roster.data.joinRequests.filter((r) => r.status === 'pending').length
  const requestCount = s.requestCount ?? pendingRequests
  const recorded = recordsGames(s)
  const scoring = SCORING[sessionScoring(s)]
  const estimate = cost.data?.estimate

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

  const player = (id: string): CourtPlayer => {
    const p = rosterList.find((x) => x.id === id)
    return {
      id,
      name: p?.nameSnapshot ?? 'Player',
      shortName: p ? queueMasterName(p) : 'Player',
      level: p?.level ?? null,
    }
  }
  const boxCourts: SettingsCourtsBoxCourt[] = courts.map((c) => {
    const onIt = matches.data.filter((m) => m.courtIds.includes(c.id))
    const playing = onIt.find((m) => m.state === 'active')
    const ready = onIt.find((m) => m.state === 'on_court')
    const match = playing ?? ready
    return {
      id: c.id,
      label: c.label,
      state: playing
        ? 'playing'
        : ready
          ? 'getting-ready'
          : courtOpen(c, now)
            ? 'free'
            : 'not-open',
      teamA: match?.teamA.map(player),
      teamB: match?.teamB.map(player),
      from: c.startsAt ?? s.startedAt ?? s.scheduledStartAt,
      until: c.openUntil ?? s.scheduledEndAt,
      followsSessionEnd: c.openUntil === null,
    }
  })
  // Every change saves at once; the card toasts the success, so only a failure toasts here.
  const saveCourt = (
    courtId: string,
    change: (court: (typeof courts)[number]) => { startsAt: number; openUntil: number | null },
  ) => {
    const court = courts.find((c) => c.id === courtId)
    if (!court) return
    updateCourt.mutate(
      { sessionId, courtId, label: court.label, ...change(court) },
      { onError: (error) => toast.error(errorMessage(error)) },
    )
  }
  const startOf = (c: (typeof courts)[number]) => c.startsAt ?? s.startedAt ?? s.scheduledStartAt

  return (
    <section aria-label="Settings" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-lg">Setup</h2>
          <p className="m-0 text-[13px] text-fg2">
            Tonight's session settings. Formats, mode, scoring, Record games and the minimum are
            fixed after start.
          </p>
        </div>
        <Button size="sm" onClick={() => router.push(`/sessions/${sessionId}/preparation`)}>
          <Icon name="nav-gear" />
          All session settings
        </Button>
      </div>
      <SettingsCourtsBox
        courts={boxCourts}
        sessionEnd={s.scheduledEndAt}
        now={now}
        onChangeFrom={(courtId, from) =>
          saveCourt(courtId, (c) => ({ startsAt: from, openUntil: c.openUntil }))
        }
        onChangeUntil={(courtId, until) =>
          saveCourt(courtId, (c) => ({ startsAt: startOf(c), openUntil: until }))
        }
        onFollowSessionEnd={(courtId) =>
          saveCourt(courtId, (c) => ({ startsAt: startOf(c), openUntil: null }))
        }
        onExtend={(minutes) =>
          extend.mutate(
            { sessionId, minutes },
            { onError: (error) => toast.error(errorMessage(error)) },
          )
        }
        onAddCourt={onAddCourt}
      />
      <div className="grid gap-4 min-[761px]:grid-cols-2">
        <SettingsCard
          title="Game rules"
          chip="Fixed after start"
          tiles={[
            {
              id: 'minimum',
              label: `Minimum games each · ${s.minimumIsCalculated ? 'calculated' : 'set by you'}`,
              value: String(s.minimumGames),
              mono: true,
            },
            {
              id: 'record',
              label: `Record games${recorded ? '' : ' · not ranked'}`,
              value: recorded ? 'On' : 'Off',
            },
          ]}
          rows={[
            { label: 'Formats', value: formats },
            { label: 'Mode', value: MODES[s.sessionMode].label, note: MODES[s.sessionMode].text },
            { label: 'Scoring', value: scoring.label, note: scoring.text },
          ]}
        />
        <SettingsCard
          title="Players"
          tiles={[
            { id: 'confirmed', label: 'Confirmed', value: String(rosterList.length), mono: true },
            { id: 'present', label: 'Present', value: String(present), mono: true },
          ]}
          rows={[
            {
              label: 'Match requests',
              value: requestFormats.length ? requestFormats.join(', ') : 'Off',
              note: requestFormats.length
                ? 'Formats players can ask for'
                : "Players can't request matches",
            },
          ]}
          actions={
            <>
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
            </>
          }
        />
        {estimate ? (
          <SettingsCard
            title="Costs"
            tiles={[
              {
                id: 'per-head',
                label: `Each player pays${estimate.isCustom ? ' (custom)' : ''}`,
                value: formatPeso(estimate.perHead),
                mono: true,
              },
              {
                id: 'total',
                label: 'Estimated total',
                value: formatPeso(estimate.total),
                mono: true,
              },
            ]}
            rows={[
              { label: 'Break-even share', value: formatPeso(estimate.breakEven) },
              { label: 'Result', value: <CostEstimateResult result={estimate.result} /> },
            ]}
            actions={
              <Button size="sm" onClick={onOpenPayments}>
                Payments
              </Button>
            }
          />
        ) : null}
        <SettingsCard title="Notes">
          <p className={`m-0 whitespace-pre-line text-[13px] ${s.notes ? '' : 'text-fg2'}`}>
            {s.notes || 'No notes for tonight.'}
          </p>
        </SettingsCard>
      </div>
      {cost.isError ? <QueryError query={cost} title="Couldn't load the cost estimate." /> : null}
      <SessionHosts sessionId={sessionId} />
      <div className="grid items-stretch gap-3 sm:grid-cols-2">
        <SessionLinkCard
          link={sessionLink}
          pendingCount={pendingRequests}
          onCopyLink={() => void copyLink()}
          onOpenAsGuest={() => router.push(publicHref)}
          onPreviewPublicPage={() => router.push(`/sessions/${sessionId}/public-page`)}
        />
        <WhoCanJoinCard
          acceptJoinRequests={s.acceptJoinRequests}
          alwaysRequireRequest={s.alwaysRequireRequest ?? false}
          onAcceptJoinRequestsChange={(accept) =>
            setAcceptJoinRequests.mutate({ sessionId, accept }, options)
          }
          onAlwaysRequireRequestChange={(always) =>
            setAlwaysRequireRequest.mutate({ sessionId, always }, options)
          }
        />
      </div>
      <AddPlayer sessionId={sessionId} open={addPlayerOpen} onOpenChange={setAddPlayerOpen} />
    </section>
  )
}
