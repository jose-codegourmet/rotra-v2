import { Card } from '@rotra/ui/card'
import { KeyValueList } from '@rotra/ui/key-value-list'
import type { ReactNode } from 'react'

export type SessionSetupCardProps = {
  courtLabels: string[]
  /** "Doubles", "Singles + Doubles" or "No standard format" */
  formatsLabel: string
  modeLabel: string
  modeDescription: string
  minimumGames: number
  minimum:
    | {
        kind: 'calculated'
        players: number
        usableCourts: number
        /** "3 h" */
        durationLabel: string
        low: number
        high: number
      }
    | { kind: 'set'; low: number; high: number }
  rosterCount: number
  presentCount: number
  /** Extra rows, e.g. the Costs row from Queue › Financials */
  extraRows?: { label: string; value: ReactNode }[]
  className?: string
}

/** Preparation › Overview › Setup: courts, formats, mode, minimum with its calculation, roster. */
export function SessionSetupCard({
  courtLabels,
  formatsLabel,
  modeLabel,
  modeDescription,
  minimumGames,
  minimum,
  rosterCount,
  presentCount,
  extraRows = [],
  className,
}: SessionSetupCardProps) {
  return (
    <Card asChild className={className}>
      <section aria-label="Setup" className="flex flex-col gap-3">
        <h2>Setup</h2>
        <KeyValueList
          items={[
            { label: 'Courts', value: courtLabels.join(', ') },
            { label: 'Formats', value: formatsLabel },
            {
              label: 'Mode',
              value: (
                <>
                  {modeLabel} · <span className="text-fg2">{modeDescription}</span>
                </>
              ),
            },
            {
              label: 'Minimum',
              value: (
                <>
                  {minimumGames} completed games per player
                  <br />
                  <span className="text-[13px] text-fg2">
                    {minimum.kind === 'calculated'
                      ? `Calculated: ${minimum.players} players on ${minimum.usableCourts} court${minimum.usableCourts > 1 ? 's' : ''} for ${minimum.durationLabel} gives about ${minimum.low}–${minimum.high} games each. Updates as the roster changes.`
                      : `Set by you. The estimate suggests ${minimum.low}–${minimum.high}.`}
                  </span>
                </>
              ),
            },
            { label: 'Roster', value: `${rosterCount} confirmed · ${presentCount} present` },
            ...extraRows,
          ]}
        />
      </section>
    </Card>
  )
}
