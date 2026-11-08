import type { PlayerSessionAccess } from '@rotra/data/public-session/types'
import { Button } from '@rotra/ui/button'
import { EmptyState } from '@rotra/ui/empty-state'
import { MatchCard } from '@rotra/ui/match-card'
import { Notice } from '@rotra/ui/notice'
import { Skeleton } from '@rotra/ui/skeleton'

export type PublicSessionQueueProps = {
  access: PlayerSessionAccess | null
  loginHref?: string
  checking?: boolean
  failed?: boolean
  onRetry: () => void
}

/** Q-PUBLIC Details: the existing queue tiles, with no club operations or profile controls. */
export function PublicSessionQueue({
  access,
  loginHref,
  checking,
  failed,
  onRetry,
}: PublicSessionQueueProps) {
  return (
    <section aria-label="Queue" className="mt-5 flex flex-col gap-3">
      <h2 className="text-lg font-bold">Queue</h2>
      {access ? (
        <>
          <p className="text-[13px] text-fg2">Read-only · Last synced queue</p>
          {access.queue.length ? (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {access.queue.map((match, index) => {
                const team = (players: typeof match.teamA, side: string) =>
                  players.map((player, i) => ({
                    id: `${match.matchNo}:${side}:${i}`,
                    name: player.name,
                    shortName: player.name,
                    level: player.level,
                  }))
                return (
                  <MatchCard
                    key={match.matchNo}
                    readOnly
                    position={index + 1}
                    matchNo={match.matchNo}
                    format={match.format}
                    origin="manual"
                    manualProtected={false}
                    status={{ kind: 'blocked', reason: 'Waiting in queue' }}
                    teamA={team(match.teamA, 'A')}
                    teamB={team(match.teamB, 'B')}
                  />
                )
              })}
            </div>
          ) : (
            <EmptyState title="No matches queued yet." />
          )}
        </>
      ) : checking ? (
        <Skeleton className="h-24 rounded-lg" />
      ) : failed ? (
        <Notice tone="error">
          Couldn't check Player access. <Button onClick={onRetry}>Retry</Button>
        </Notice>
      ) : (
        <Notice tone="info">
          Log in with ROTRA Player to see the queue.
          {loginHref ? (
            <Button asChild>
              <a href={loginHref}>Log in with ROTRA Player</a>
            </Button>
          ) : null}
        </Notice>
      )}
    </section>
  )
}
