import { Card } from '@rotra/ui/card'
import { cn } from '@rotra/ui/cn'
import { KeyValueList } from '@rotra/ui/key-value-list'

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
  /** The session's public notes; omit or null to hide the paragraph */
  notes?: string | null
  /** Time of the last sync the page reflects, already formatted ("7:42 PM") */
  lastUpdatedLabel: string
  /** The server knows changes from the venue are still waiting to sync */
  hasPendingChanges?: boolean
  className?: string
}

/** "Doubles", "Singles + Doubles" or "No standard format", as the prototype's fmtFormats(). */
function formatsLabel({ singles, doubles }: PublicSessionDetailsProps['formats']) {
  const parts = [singles ? 'Singles' : null, doubles ? 'Doubles' : null].filter(Boolean)
  return parts.length ? parts.join(' + ') : 'No standard format'
}

/**
 * The public page's Details tab (Q-PUBLIC-DETAILS): When, Venue, Courts, Formats, Mode and Minimum,
 * the notes, and the "Slots are confirmed with the Queue Master directly" footer with the last sync
 * time. Never shows fees, costs or payment states.
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
  notes,
  lastUpdatedLabel,
  hasPendingChanges = false,
  className,
}: PublicSessionDetailsProps) {
  return (
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
}
