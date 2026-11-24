'use client'

import { REQUEST_FORMAT_PILL } from '@rotra/data/match/matchRequestDecisions'
import { allowedRequestFormats } from '@rotra/data/match-request/rules'
import { estimateMinimum, sessionMinutes } from '@rotra/data/queue-session/queueSession.rules'
import { recordsGames, sessionScoring } from '@rotra/data/queue-session/types'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import { useSessionCostEstimate } from '@rotra/data/session-cost/useSessionCostEstimate'
import { useSessionRoster } from '@rotra/data/session-roster/useSessionRoster'
import { courtNextDay } from '@rotra/schema/court-window'
import { levelRestrictionDescription, levelRestrictionLabel } from '@rotra/schema/level-restriction'
import { formatPeso } from '@rotra/schema/money'
import { SCORING } from '@rotra/schema/scoring'
import { Button } from '@rotra/ui/button'
import { CostEstimateResult } from '@rotra/ui/cost-estimate-summary'
import { formatMinutes } from '@rotra/ui/forms/session-setup-form/helpers'
import { Icon } from '@rotra/ui/icon'
import { SettingsCard } from '@rotra/ui/settings-card'
import { Skeleton } from '@rotra/ui/skeleton'
import Link from 'next/link'
import { QueryError } from '@/app/(operator)/_components/query-error/QueryError'
import { MODES } from '@/app/(operator)/sessions/[sessionId]/_components/settings-view/SettingsView'

const time = (at: number) =>
  new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
const date = (at: number) =>
  new Date(at).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })

/**
 * The Preparation page's Settings tab, before start only (the prototype's prepSettings()): the setup
 * as cards (Date and venue, Courts, Game rules, Costs when set, Notes). Each card's Edit opens the
 * session editor at its page (0, 0, 1, 2, 2 = steps 1, 1, 2, 3, 3) and Back from the editor returns
 * here (`?from=settings`). Saving in the editor needs an internet connection.
 */
export function PreparationSettings({ sessionId }: { sessionId: string }) {
  const session = useQueueSession(sessionId)
  const roster = useSessionRoster(sessionId)
  const cost = useSessionCostEstimate(sessionId)

  const s = session.data
  if (session.isError) return <QueryError query={session} title="Couldn't load this session." />
  if (roster.isError) return <QueryError query={roster} title="Couldn't load the roster." />
  if (!s || !roster.data)
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 min-[761px]:grid-cols-2">
          <Skeleton className="h-40 rounded-lg" />
          <Skeleton className="h-40 rounded-lg" />
        </div>
      </div>
    )

  const edit = (step: number, what: string) => (
    <Button size="sm" asChild aria-label={`Edit ${what}`}>
      <Link href={`/sessions/${sessionId}/edit?step=${step}&from=settings`}>
        <Icon name="edit" />
        Edit
      </Link>
    </Button>
  )
  const courts = s.courts.filter((c) => !c.removedAt)
  const rosterList = roster.data.roster
  const minutes = sessionMinutes(s.scheduledStartAt, s.scheduledEndAt)
  const perCourt = s.playersPerCourt ?? 8
  const players = rosterList.length || s.expectedPlayers || courts.length * perCourt
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
  const requestFormats = allowedRequestFormats(s).map((format) => REQUEST_FORMAT_PILL[format])
  const recorded = recordsGames(s)
  const scoring = SCORING[sessionScoring(s)]
  const estimate = cost.data?.estimate
  const windowTime = (at: number) =>
    `${time(at)}${courtNextDay(at, s.scheduledStartAt) ? ' · next day' : ''}`

  return (
    <section aria-label="Settings" className="flex flex-col gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="text-lg">Settings</h2>
        <p className="m-0 text-[13px] text-fg2">
          Everything set when the session was made. Edit opens that part of the session editor;
          saving needs an internet connection.
        </p>
      </div>
      <div className="grid gap-4 min-[761px]:grid-cols-2">
        <SettingsCard
          title="Date and venue"
          headerAction={edit(0, 'date and venue')}
          rows={[
            { label: 'Title', value: s.title },
            {
              label: 'When',
              value: `${date(s.scheduledStartAt)} · ${time(s.scheduledStartAt)}–${time(s.scheduledEndAt)}`,
              note: formatMinutes(minutes),
            },
            { label: 'Venue', value: s.venueName },
          ]}
        />
        <SettingsCard
          title="Courts"
          headerAction={edit(0, 'courts')}
          tiles={[
            { id: 'booked', label: 'Courts booked', value: String(courts.length), mono: true },
            {
              id: 'slots',
              label: `Slots · ${perCourt} a court`,
              value: String(courts.length * perCourt),
              mono: true,
            },
          ]}
          rows={courts.map((c) => ({
            id: c.id,
            label: c.label,
            value: `${windowTime(c.startsAt ?? s.scheduledStartAt)}–${windowTime(c.openUntil ?? s.scheduledEndAt)}`,
            note: c.openUntil === null ? 'Follows session end' : 'Set time',
          }))}
        />
        <SettingsCard
          title="Game rules"
          headerAction={edit(1, 'game rules')}
          tiles={[
            {
              id: 'minimum',
              label: `Minimum games each · ${s.minimumIsCalculated ? `calculated (${est.low}–${est.high})` : 'set by you'}`,
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
            {
              label: 'Levels',
              value: levelRestrictionLabel(s.levelRestriction),
              note: levelRestrictionDescription(s.levelRestriction),
            },
            { label: 'Scoring', value: scoring.label, note: scoring.text },
            {
              label: 'Match requests',
              value: requestFormats.length ? requestFormats.join(', ') : 'Off',
            },
          ]}
        />
        {estimate ? (
          <SettingsCard
            title="Costs"
            headerAction={edit(2, 'costs')}
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
          />
        ) : null}
        <SettingsCard title="Notes" headerAction={edit(2, 'notes')}>
          <p className={`m-0 whitespace-pre-line text-[13px] ${s.notes ? '' : 'text-fg2'}`}>
            {s.notes || 'No notes. Notes show on the public session page.'}
          </p>
        </SettingsCard>
      </div>
      {cost.isError ? <QueryError query={cost} title="Couldn't load the cost estimate." /> : null}
    </section>
  )
}
