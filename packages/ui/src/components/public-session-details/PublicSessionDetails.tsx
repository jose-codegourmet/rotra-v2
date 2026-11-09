import { formatPeso } from '@rotra/schema/money'
import { Card } from '@rotra/ui/card'
import { cn } from '@rotra/ui/cn'
import { CourtCard } from '@rotra/ui/court-card'
import type { CourtPlayer } from '@rotra/ui/court-drawing'
import { KeyValueList } from '@rotra/ui/key-value-list'
import type { ReactNode } from 'react'

/**
 * One entry of Courts now, shaped from the signed-in projection's `courtsNow`: names already per
 * the public rule (first word, masked guests), the start time already formatted ("9:16 PM").
 */
export type PublicSessionCourtNow = {
  /** Stable per entry (the first court's id) */
  id: string
  /** "Court 2", or "Court 1 + Court 2" when merged */
  label: string
  merged: boolean
  status: 'playing' | 'getting-ready' | 'free'
  teamA: CourtPlayer[]
  teamB: CourtPlayer[]
  /** "9:16 PM"; omit while getting ready and when free */
  startedLabel?: string
}

export type PublicSessionDetailsProps = {
  /** "Sun, Oct 26, 6:00 PM–9:00 PM (3 h)": date, start–end and duration, already formatted */
  when: string
  venueName: string
  /** Shown under the venue name; omit when the venue has no address */
  venueAddress?: string | null
  /** Court labels in order, e.g. ["Court 1", "Court 2"]; the row reads "N · labels" */
  courtLabels: string[]
  formats: { singles: boolean; doubles: boolean }
  /** "Fair" */
  modeLabel: string
  /** "Mainly level-matched games, roughly 10% easy games." */
  modeDescription: string
  minimumGames: number
  /**
   * Payment per player in centavos (the custom amount or the break-even share): shown as the
   * Payment row after Minimum; 0 reads "Free"; null or omitted means no estimate is saved, so the
   * row is left out. Shown to every audience.
   */
  amountDuePerPlayer?: number | null
  /** The session's public notes; omit or null to hide the paragraph */
  notes?: string | null
  /** Time of the last sync the page reflects, already formatted ("7:42 PM") */
  lastUpdatedLabel: string
  /** The server knows changes from the venue are still waiting to sync */
  hasPendingChanges?: boolean
  /**
   * Signed-in viewers of a live session: renders the Courts now section after the card (read-only
   * court cards). Omit for visitors; an empty array renders nothing.
   */
  courtsNow?: PublicSessionCourtNow[]
  /** The read-only Queue (PublicSessionQueue), rendered after Courts now; the caller owns it */
  queueSlot?: ReactNode
  className?: string
}

/** "Doubles", "Singles + Doubles" or "No standard format", as the prototype's fmtFormats(). */
function formatsLabel({ singles, doubles }: PublicSessionDetailsProps['formats']) {
  const parts = [singles ? 'Singles' : null, doubles ? 'Doubles' : null].filter(Boolean)
  return parts.length ? parts.join(' + ') : 'No standard format'
}

/**
 * The public page's Details tab (Q-PUBLIC-DETAILS): When, Venue, Courts, Formats, Mode, Minimum and
 * Payment (per player, never costs or paid states), the notes, and the "Slots are confirmed with
 * the Queue Master directly" footer with the last sync time. For signed-in viewers of a live
 * session it continues with Courts now and the Queue slot.
 */
export function PublicSessionDetails({
  when,
  venueName,
  venueAddress,
  courtLabels,
  formats,
  modeLabel,
  modeDescription,
  minimumGames,
  amountDuePerPlayer,
  notes,
  lastUpdatedLabel,
  hasPendingChanges = false,
  courtsNow,
  queueSlot,
  className,
}: PublicSessionDetailsProps) {
  const details = (
    <Card asChild className={cn('flex flex-col gap-3', className)}>
      <section aria-label="Details">
        <KeyValueList
          items={[
            { label: 'When', value: when },
            {
              label: 'Venue',
              value: (
                <>
                  {venueName}
                  {venueAddress ? (
                    <>
                      <br />
                      <span className="text-[13px] text-fg2">{venueAddress}</span>
                    </>
                  ) : null}
                </>
              ),
            },
            { label: 'Courts', value: `${courtLabels.length} · ${courtLabels.join(', ')}` },
            { label: 'Formats', value: formatsLabel(formats) },
            {
              label: 'Mode',
              value: (
                <>
                  {modeLabel} · <span className="text-fg2">{modeDescription}</span>
                </>
              ),
            },
            { label: 'Minimum', value: `${minimumGames} games per player` },
            ...(amountDuePerPlayer == null
              ? []
              : [
                  {
                    label: 'Payment',
                    value:
                      amountDuePerPlayer === 0 ? (
                        'Free'
                      ) : (
                        <>
                          {formatPeso(amountDuePerPlayer)} per player{' '}
                          <span className="text-[13px] text-fg2">· paid at the venue</span>
                        </>
                      ),
                  },
                ]),
          ]}
        />
        {notes ? <p className="m-0 [overflow-wrap:anywhere]">{notes}</p> : null}
        <p className="m-0 text-[13px] text-fg2">
          Slots are confirmed with the Queue Master directly. Last updated {lastUpdatedLabel}.
          {hasPendingChanges ? " Recent changes from the venue haven't synced yet." : null}
        </p>
      </section>
    </Card>
  )
  const courts = courtsNow ?? []
  const showCourts = courts.length > 0
  if (!showCourts && !queueSlot) return details
  return (
    <>
      {details}
      {showCourts ? (
        <section aria-label="Courts now" className="mt-5 flex flex-col gap-3">
          <h2 className="text-lg font-bold">Courts now</h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,250px),1fr))] gap-3">
            {courts.map((court) => (
              <CourtCard
                key={court.id}
                variant="read-only"
                label={court.label}
                state={court.status}
                merged={court.merged}
                teamA={court.teamA}
                teamB={court.teamB}
                startedLabel={court.startedLabel}
              />
            ))}
          </div>
        </section>
      ) : null}
      {queueSlot}
    </>
  )
}
