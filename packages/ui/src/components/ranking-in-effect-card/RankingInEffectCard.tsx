import type { RankingPolicyVersion } from '@rotra/data/ranking-settings/types'
import { ActivityLog, type ActivityLogEntry } from '@rotra/ui/activity-log'
import { Card } from '@rotra/ui/card'
import { Chip } from '@rotra/ui/chip'
import { type ValueTile, ValueTiles } from '@rotra/ui/value-tiles'
import { useId } from 'react'

export type RankingInEffectCardProps = {
  /** The accepted version in effect. Never a draft: player pages describe these values. */
  effective: RankingPolicyVersion
  /** Every saved version, oldest first (as stored); listed newest first */
  versions: RankingPolicyVersion[]
}

const WHEN = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'Asia/Manila',
})

/** Basis points to whole percent (7000 → 70) */
const percent = (bp: number) => bp / 100

function effectiveTiles(v: RankingPolicyVersion): ValueTile[] {
  return [
    {
      id: 'assessment',
      label: 'Assessment',
      value: `${percent(v.assessmentWeightBp)}%`,
      mono: true,
    },
    {
      id: 'performance',
      label: 'Performance',
      value: `${percent(v.performanceWeightBp)}%`,
      mono: true,
    },
    {
      id: 'leaderboard',
      label: 'Leaderboard',
      value: String(v.recentStandardMatchThreshold),
      sub: 'recent matches',
      mono: true,
    },
  ]
}

function versionEntries(versions: RankingPolicyVersion[]): ActivityLogEntry[] {
  return [...versions]
    .sort((a, b) => b.version - a.version)
    .map((v) => ({
      id: String(v.version),
      lead: `Version ${v.version}`,
      text: `${percent(v.assessmentWeightBp)}% / ${percent(v.performanceWeightBp)}% · ${v.recentStandardMatchThreshold} matches`,
      at: v.effectiveAt,
      actor: v.createdByEmail,
    }))
}

/**
 * Ranking settings (A-RANK-CONFIG), read-only side: the version in effect with its weights and
 * leaderboard requirement, then every saved version, newest first.
 */
export function RankingInEffectCard({ effective, versions }: RankingInEffectCardProps) {
  const headingId = useId()
  const versionsId = useId()
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <Card asChild>
        <section aria-labelledby={headingId} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <h2 id={headingId}>In effect</h2>
              <p className="m-0 text-[13px] text-fg2">
                Version {effective.version} · since {WHEN.format(new Date(effective.effectiveAt))}
              </p>
            </div>
            <Chip tone="accent">Live</Chip>
          </div>
          <ValueTiles tiles={effectiveTiles(effective)} />
          <p className="m-0 text-[13px] text-fg2 [overflow-wrap:anywhere]">
            Set by {effective.createdByEmail}. Player pages describe these values, not your draft.
          </p>
        </section>
      </Card>
      <Card asChild>
        <section aria-labelledby={versionsId} className="flex flex-col gap-3">
          <h2 id={versionsId}>Versions</h2>
          <ActivityLog entries={versionEntries(versions)} emptyText="" />
        </section>
      </Card>
    </div>
  )
}
