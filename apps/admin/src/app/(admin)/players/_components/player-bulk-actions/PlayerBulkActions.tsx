'use client'
import { useAdminConnectivity } from '@rotra/data/admin-account/use-admin-connectivity'
import { adminPlayersCsv } from '@rotra/data/admin-player/management-rules'
import type { AdminPlayer, AdminPlayerBulkResult } from '@rotra/data/admin-player/types'
import { useAdminPlayerMutations } from '@rotra/data/admin-player/useAdminPlayerMutations'
import { useAdminPlayerSelection } from '@rotra/data/admin-player/useAdminPlayerSelection'
import { AdminPlayerBulkBar } from '@rotra/ui/admin-player-bulk-bar'
import { AdminPlayerChangeForm } from '@rotra/ui/admin-player-change-form'
import { CopyPlayerValue } from '@rotra/ui/copy-player-value'
import { ErrorState } from '@rotra/ui/error-state'
import { Skeleton } from '@rotra/ui/skeleton'
import { toast } from '@rotra/ui/toaster'
import { useState } from 'react'
export function PlayerBulkActions({ ids, onClear }: { ids: string[]; onClear: () => void }) {
  const selection = useAdminPlayerSelection(ids),
    { offline } = useAdminConnectivity(),
    mutations = useAdminPlayerMutations()
  const [dialog, setDialog] = useState<{
      action: 'archive' | 'restore' | 'remove'
      players: AdminPlayer[]
    } | null>(null),
    [results, setResults] = useState<AdminPlayerBulkResult[] | undefined>(),
    [copyValue, setCopyValue] = useState('')
  const players = selection.data ?? []
  return (
    <>
      {selection.isError ? (
        <ErrorState
          title="Couldn't load selected players."
          onRetry={() => void selection.refetch()}
        />
      ) : !selection.data ? (
        <Skeleton label="Loading selection" />
      ) : players.length ? (
        <AdminPlayerBulkBar
          players={players}
          offline={offline}
          onClear={onClear}
          onAction={(action) => {
            if (action === 'export') {
              const url = URL.createObjectURL(
                new Blob([adminPlayersCsv(players)], { type: 'text/csv;charset=utf-8' }),
              )
              const link = document.createElement('a')
              link.href = url
              link.download = 'rotra-players.csv'
              link.click()
              setTimeout(() => URL.revokeObjectURL(url), 1000)
            } else if (action === 'copy') {
              // Unclaimed club records have no RTR ID to copy.
              const value = players.flatMap((p) => (p.rtrId ? [p.rtrId] : [])).join('\n')
              void Promise.resolve()
                .then(() => navigator.clipboard.writeText(value))
                .then(
                  () => toast.success('RTR IDs copied'),
                  () => setCopyValue(value),
                )
            } else {
              mutations.change.reset()
              setResults(undefined)
              setDialog({ action, players })
            }
          }}
        />
      ) : null}
      <CopyPlayerValue value={copyValue} onClose={() => setCopyValue('')} />
      {dialog ? (
        <AdminPlayerChangeForm
          players={dialog.players}
          action={dialog.action}
          open
          offline={offline}
          pending={mutations.change.isPending}
          error={mutations.change.error?.message}
          results={results}
          onClose={() => setDialog(null)}
          onSubmit={(reason, confirmations, ids) =>
            mutations.change.mutate(
              { ids, reason, confirmations, action: dialog.action },
              {
                onSuccess: (next) => {
                  setResults((previous) => [
                    ...(previous ?? []).filter((r) => !ids.includes(r.id)),
                    ...next,
                  ])
                  toast.success(
                    `${next.filter((r) => r.success).length} succeeded, ${next.filter((r) => !r.success).length} failed`,
                  )
                },
                onError: (error) => toast.error(error.message),
              },
            )
          }
        />
      ) : null}
    </>
  )
}
