'use client'
import { useAdminConnectivity } from '@rotra/data/admin-account/use-admin-connectivity'
import type { AdminPlayer } from '@rotra/data/admin-player/types'
import { useAdminPlayerMutations } from '@rotra/data/admin-player/useAdminPlayerMutations'
import { AdminEditPlayerForm } from '@rotra/ui/admin-edit-player-form'
import { AdminPlayerActions } from '@rotra/ui/admin-player-actions'
import { AdminPlayerChangeForm } from '@rotra/ui/admin-player-change-form'
import { CopyPlayerValue } from '@rotra/ui/copy-player-value'
import { toast } from '@rotra/ui/toaster'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { usePlayerEdit } from '../player-edit/usePlayerEdit'
export function PlayerManagementActions({ player }: { player: AdminPlayer }) {
  const router = useRouter(),
    search = useSearchParams(),
    [copyValue, setCopyValue] = useState('')
  const from = search.get('from') ?? search.toString()
  const copy = async (value: string, message: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(message)
    } catch {
      setCopyValue(value)
    }
  }
  const [action, setAction] = useState<'archive' | 'restore' | 'remove' | null>(null)
  const [editing, setEditing] = useState(false),
    { offline } = useAdminConnectivity(),
    mutations = useAdminPlayerMutations(),
    client = useQueryClient(),
    edit = usePlayerEdit(mutations.update, player.id)
  return (
    <>
      <AdminPlayerActions
        player={player}
        offline={offline}
        pending={mutations.link.isPending || edit.isPending || mutations.change.isPending}
        onAction={(action) => {
          if (action === 'edit') {
            edit.reset()
            setEditing(true)
          } else if (action === 'archive' || action === 'restore' || action === 'remove') {
            mutations.change.reset()
            setAction(action)
          } else if (action === 'copy') void copy(player.rtrId, 'RTR ID copied')
          else if (action === 'link')
            mutations.link.mutate(player.id, {
              onSuccess: (link) => {
                const base =
                  typeof location !== 'undefined' && location.hostname === 'localhost'
                    ? 'http://localhost:9001'
                    : 'https://player.rotra.club'
                void copy(
                  `${base}/claim/${link.token}`,
                  `Registration link copied · expires ${new Date(link.expiresAt).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' })}`,
                )
              },
              onError: (error) => toast.error(error.message),
            })
          else if (action === 'quick') {
            const params = new URLSearchParams(from)
            params.set('peek', player.id)
            router.push(`/players?${params}`, { scroll: false })
          } else if (action === 'profile')
            router.push(`/players/${player.id}?from=${encodeURIComponent(from)}`)
          else router.push(`/players/${player.id}?tab=history&from=${encodeURIComponent(from)}`)
        }}
      />
      <CopyPlayerValue value={copyValue} onClose={() => setCopyValue('')} />
      {editing ? (
        <AdminEditPlayerForm
          // Not keyed by revision: a saved profile with a refused email keeps what was typed.
          key={player.id}
          player={player}
          open
          onClose={() => setEditing(false)}
          offline={offline}
          isPending={edit.isPending}
          serverError={edit.serverError}
          emailError={edit.emailError}
          emailLocked={edit.emailLocked}
          onReload={() => {
            void client.invalidateQueries()
            setEditing(false)
          }}
          onSubmit={(values) => void edit.submit(player, values, () => setEditing(false))}
        />
      ) : null}
      {action ? (
        <AdminPlayerChangeForm
          players={[player]}
          action={action}
          open
          onClose={() => setAction(null)}
          pending={mutations.change.isPending}
          offline={offline}
          error={mutations.change.error?.message}
          results={mutations.change.data}
          onSubmit={(reason, confirmations, ids) =>
            mutations.change.mutate(
              { action, ids, reason, confirmations },
              {
                onSuccess: (results) => {
                  const success = results.filter((r) => r.success).length
                  toast.success(
                    `${success} ${action === 'archive' ? 'archived' : action === 'restore' ? 'restored' : 'removed'}`,
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
