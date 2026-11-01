'use client'
import type { AdminPlayer } from '@rotra/data/admin-player/types'
import { AdminPlayerClubs } from '@rotra/ui/admin-player-clubs'
import { Avatar } from '@rotra/ui/avatar'
import { Card } from '@rotra/ui/card'
import { Checkbox } from '@rotra/ui/checkbox'
import { PlayerAccountChip } from '@rotra/ui/player-account-chip'
import { RankStatusChip } from '@rotra/ui/rank-status-chip'
import type { ReactNode } from 'react'
export type AdminPlayerCardProps = {
  player: AdminPlayer
  href: string
  createdBy: string
  onOpen: () => void
  actions?: ReactNode
  selected?: boolean
  onSelect?: (selected: boolean) => void
}
export function AdminPlayerCard({
  player: p,
  href,
  createdBy,
  onOpen,
  actions,
  selected,
  onSelect,
}: AdminPlayerCardProps) {
  return (
    <Card className="relative flex min-w-0 flex-col gap-3">
      <div className="flex items-start gap-3">
        <Avatar name={p.name} src={p.picture ?? undefined} />
        <div className="min-w-0 flex-1">
          <a
            className="font-bold text-fg [overflow-wrap:anywhere] hover:text-accent after:absolute after:inset-0"
            href={href}
            onClick={(e) => {
              if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && e.button === 0) {
                e.preventDefault()
                onOpen()
              }
            }}
          >
            {p.name}
          </a>
          {p.nickname ? <p className="text-sm text-fg2">“{p.nickname}”</p> : null}
        </div>
        <div className="relative z-10">{actions}</div>
      </div>
      <p className="font-mono text-xs [overflow-wrap:anywhere]">{p.rtrId}</p>
      <div className="flex flex-wrap gap-2">
        <PlayerAccountChip claimed={p.claimed} />
        <RankStatusChip status={p.rankStatus} />
        {p.archivedAt ? <span className="text-sm text-fg2">Archived</span> : null}
      </div>
      <AdminPlayerClubs clubs={p.clubs} />
      <p className="text-sm text-fg2">
        {createdBy} · Added {p.addedOn}
      </p>
      {onSelect ? (
        <div className="relative z-10">
          <Checkbox label={`Select ${p.name}`} checked={selected} onChange={onSelect} />
        </div>
      ) : null}
    </Card>
  )
}
