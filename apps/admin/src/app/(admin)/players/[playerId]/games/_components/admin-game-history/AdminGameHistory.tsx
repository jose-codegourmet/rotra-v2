'use client'
import { useAdminPlayer } from '@rotra/data/admin-player/useAdminPlayer'
import { useAdminPlayerGames } from '@rotra/data/admin-player/useAdminPlayerGames'
import { AdminPlayerHistory } from '@rotra/ui/admin-player-history'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDenyOnPermissionError } from '../../../../../_components/admin-workspace-shell/AdminWorkspaceShell'
export function AdminGameHistory({ playerId }: { playerId: string }) {
  const search = useSearchParams(),
    router = useRouter(),
    player = useAdminPlayer(playerId),
    games = useAdminPlayerGames(playerId)
  const denied = useDenyOnPermissionError(player.error, games.error)
  if (denied) return null
  const from = search.get('from') ?? '',
    back =
      search.get('origin') === 'list'
        ? `/players?${from}`
        : `/players/${playerId}?from=${encodeURIComponent(from)}`
  return (
    <AdminPlayerHistory
      linkComponent={Link}
      name={player.data?.name ?? 'Player'}
      backHref={back}
      sessions={games.data}
      error={player.isError || games.isError}
      notFound={player.data === null}
      onRetry={() => {
        void player.refetch()
        void games.refetch()
      }}
      tab={
        ['other', 'all'].includes(search.get('tab') ?? '')
          ? (search.get('tab') ?? 'counted')
          : 'counted'
      }
      club={search.get('club') ?? ''}
      from={search.get('since') ?? ''}
      to={search.get('until') ?? ''}
      page={Number(search.get('page')) || 1}
      onChange={(patch) => {
        const params = new URLSearchParams(search.toString())
        for (const [k, v] of Object.entries(patch))
          if (v) params.set(k, v)
          else params.delete(k)
        router.push(`?${params}`, { scroll: false })
      }}
    />
  )
}
