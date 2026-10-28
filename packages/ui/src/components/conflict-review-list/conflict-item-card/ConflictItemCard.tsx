'use client'

import type { SyncConflict } from '@rotra/data/sync/types'
import { Card } from '@rotra/ui/card'
import { Chip } from '@rotra/ui/chip'
import { MatchRecordCard } from '@rotra/ui/match-record-card'

export type ConflictItemCardProps = { conflict: SyncConflict; onSelectPlayer: (id: string) => void }
const ordinal = (n: number) =>
  `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th'}`
export function ConflictItemCard({ conflict, onSelectPlayer }: ConflictItemCardProps) {
  return (
    <Card className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="m-0 font-bold">
          Match {conflict.matchNumber} · {conflict.courtLabel}
        </h3>
        <Chip tone="warn">Needs attention</Chip>
      </div>
      <div className="grid gap-3 min-[700px]:grid-cols-2">
        {conflict.versions.map((version, index) => (
          <div
            key={`${version.deviceLabel}-${version.order}-${index}`}
            className="flex min-w-0 flex-col gap-2"
          >
            <p className="m-0 text-sm text-fg2">
              Recorded on {version.deviceLabel}, {ordinal(version.order)} change
            </p>
            <MatchRecordCard
              number={conflict.matchNumber}
              courtLabel={conflict.courtLabel}
              teamA={version.teamA}
              teamB={version.teamB}
              winningTeam={version.winner ?? null}
              score={version.score}
              onSelectPlayer={onSelectPlayer}
            />
          </div>
        ))}
      </div>
    </Card>
  )
}
