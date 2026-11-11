'use client'
import type { AdminPlayer } from '@rotra/data/admin-player/types'
import { Avatar } from '@rotra/ui/avatar'
import { Card } from '@rotra/ui/card'
import { Checkbox } from '@rotra/ui/checkbox'
import { PlayerAccountChip } from '@rotra/ui/player-account-chip'
import { profilePictureSrc } from '@rotra/ui/profile-picture'
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
  view?: 'list' | 'grid'
}

function formatAdded(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return value
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

export function AdminPlayerCard({
  player: p,
  href,
  createdBy,
  onOpen,
  actions,
  selected,
  onSelect,
  view = 'list',
}: AdminPlayerCardProps) {
  const grid = view === 'grid'
  return (
    <Card
      className={
        grid
          ? 'relative grid min-w-0 grid-cols-[auto_1fr_auto] items-center justify-items-center gap-x-2 gap-y-1.5 px-2.5 pt-2 pb-3.5 text-center hover:border-border-strong hover:bg-elev'
          : 'relative grid min-w-0 grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-3.5 py-3 hover:border-border-strong hover:bg-elev'
      }
    >
      <div
        className={
          grid ? 'relative z-10 col-start-1 row-start-1 justify-self-start' : 'relative z-10'
        }
      >
        {onSelect ? (
          <Checkbox
            variant="compact"
            label={`Select ${p.name}`}
            checked={selected}
            onChange={onSelect}
          />
        ) : null}
      </div>
      <div className={grid ? 'col-span-3 row-start-2' : ''}>
        <Avatar
          name={p.name}
          src={profilePictureSrc(p.picture, p.id, p.name)}
          className={grid ? 'size-14 text-lg' : undefined}
        />
      </div>
      <div
        className={
          grid
            ? 'col-span-3 row-start-3 flex min-w-0 w-full flex-col items-center gap-[3px]'
            : 'flex min-w-0 flex-col gap-[3px]'
        }
      >
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
        {p.rtrId ? (
          <p className="font-mono text-xs [overflow-wrap:anywhere]">{p.rtrId}</p>
        ) : (
          <p className="text-xs text-fg2">Not registered yet</p>
        )}
        <div className={grid ? 'flex flex-wrap justify-center gap-1.5' : 'flex flex-wrap gap-1.5'}>
          <PlayerAccountChip claimed={p.claimed} />
          <RankStatusChip status={p.rankStatus} />
          {p.archivedAt ? <span className="text-sm text-fg2">Archived</span> : null}
        </div>
        <p className="text-sm text-fg2 [overflow-wrap:anywhere]">
          {createdBy} · Added {formatAdded(p.addedOn)}
        </p>
      </div>
      <div
        className={
          grid ? 'relative z-10 col-start-3 row-start-1 justify-self-end' : 'relative z-10'
        }
      >
        {actions}
      </div>
    </Card>
  )
}
