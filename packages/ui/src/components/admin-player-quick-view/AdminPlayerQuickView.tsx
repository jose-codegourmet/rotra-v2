'use client'
import type { AdminPlayer } from '@rotra/data/admin-player/types'
import type { PlayerSessionRecord } from '@rotra/data/player/types'
import { AdminPlayerClubs } from '@rotra/ui/admin-player-clubs'
import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { ErrorState } from '@rotra/ui/error-state'
import { PlayerAccountChip } from '@rotra/ui/player-account-chip'
import { PrivateContactCard } from '@rotra/ui/private-contact-card'
import { RankStatusChip } from '@rotra/ui/rank-status-chip'
import { SessionGames } from '@rotra/ui/session-games'
import { Sheet } from '@rotra/ui/sheet'
import { Skeleton } from '@rotra/ui/skeleton'
import type { ReactNode } from 'react'
export type AdminPlayerQuickViewProps = {
  linkComponent?: import('react').ElementType
  open: boolean
  onClose: () => void
  player?: AdminPlayer | null
  error?: boolean
  onRetry: () => void
  createdBy: string
  pendingRequests?: number
  sessions?: PlayerSessionRecord[]
  gamesError?: boolean
  onRetryGames: () => void
  profileHref: string
  historyHref: string
  actions?: ReactNode
  onCopyId: () => void
}
export function AdminPlayerQuickView({
  linkComponent: Link = 'a',
  open,
  onClose,
  player: p,
  error,
  onRetry,
  createdBy,
  pendingRequests,
  sessions,
  gamesError,
  onRetryGames,
  profileHref,
  historyHref,
  actions,
  onCopyId,
}: AdminPlayerQuickViewProps) {
  let left = 3
  const recent = sessions
    ?.map((s) => {
      const games = s.games.slice(0, left)
      left -= games.length
      return { ...s, games }
    })
    .filter((s) => s.games.length)
  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose()
      }}
      side
      title={p?.name ?? 'Quick view'}
      footer={
        p ? (
          <>
            <Button asChild>
              <Link href={profileHref}>View full profile</Link>
            </Button>
            <Button asChild>
              <Link href={historyHref}>View full history</Link>
            </Button>
          </>
        ) : undefined
      }
    >
      {error ? (
        <ErrorState title="Couldn't load the player." onRetry={onRetry} />
      ) : p === null ? (
        <p>Player not found.</p>
      ) : !p ? (
        <Skeleton label="Loading player" />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <Avatar name={p.name} src={p.picture ?? undefined} size={52} />
            {actions}
          </div>
          {p.nickname ? <p>“{p.nickname}”</p> : null}
          <Button variant="ghost" onClick={onCopyId}>
            {p.rtrId} · Copy
          </Button>
          <div className="flex flex-wrap gap-2">
            <PlayerAccountChip claimed={p.claimed} />
            <RankStatusChip status={p.rankStatus} />
          </div>
          <p>{p.rankStatus.text}</p>
          <AdminPlayerClubs clubs={p.clubs} expanded />
          <p className="text-sm text-fg2">
            Added {p.addedOn} · {createdBy}
            {p.archivedAt ? ' · Archived' : ''}
          </p>
          <PrivateContactCard
            phone={p.phone}
            email={p.email}
            claimed={p.claimed}
            phoneHidden={p.phoneHidden}
          />
          <p>
            {pendingRequests === undefined
              ? 'Loading contact-change requests…'
              : `${pendingRequests} pending contact-change requests`}
          </p>
          <h3>Recent games</h3>
          {gamesError ? (
            <ErrorState title="Couldn't load games." onRetry={onRetryGames} />
          ) : !recent ? (
            <Skeleton label="Loading games" />
          ) : recent.length ? (
            recent.map((s) => <SessionGames key={s.id} session={s} />)
          ) : (
            <p>No games yet</p>
          )}
        </>
      )}
    </Sheet>
  )
}
