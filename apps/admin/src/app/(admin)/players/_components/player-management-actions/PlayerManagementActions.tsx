'use client'
import { useAdminConnectivity } from '@rotra/data/admin-account/use-admin-connectivity'
import type { AdminPlayer } from '@rotra/data/admin-player/types'
import { useAdminPlayerProfile } from '@rotra/data/admin-player/useAdminPlayer'
import { useAdminPlayerGames } from '@rotra/data/admin-player/useAdminPlayerGames'
import { useAdminPlayerMutations } from '@rotra/data/admin-player/useAdminPlayerMutations'
import { appOrigin } from '@rotra/data/app-origins'
import { AdminPlayerActions } from '@rotra/ui/admin-player-actions'
import { AdminPlayerChangeForm } from '@rotra/ui/admin-player-change-form'
import { AdminPlayerQuickView } from '@rotra/ui/admin-player-quick-view'
import { CopyPlayerValue } from '@rotra/ui/copy-player-value'
import { usePhotoViewer } from '@rotra/ui/hooks/use-photo-viewer'
import { PhotoViewer } from '@rotra/ui/photo-viewer'
import { toast } from '@rotra/ui/toaster'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
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
    mutations = useAdminPlayerMutations()
  return (
    <>
      <AdminPlayerActions
        player={player}
        offline={offline}
        pending={mutations.link.isPending || mutations.change.isPending}
        onAction={(action) => {
          if (action === 'edit') {
            setEditing(true)
          } else if (action === 'archive' || action === 'restore' || action === 'remove') {
            mutations.change.reset()
            setAction(action)
          } else if (action === 'copy') void copy(player.rtrId ?? '', 'RTR ID copied')
          else if (action === 'link')
            mutations.link.mutate(player.id, {
              onSuccess: (link) => {
                const base = appOrigin('player')
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
        <PlayerEditPanel
          player={player}
          from={from}
          onClose={() => setEditing(false)}
          onCopyId={() => void copy(player.rtrId ?? '', 'RTR ID copied')}
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

/** Edit from the row's menu: the Players quick view side panel, opened on its Edit view. */
function PlayerEditPanel({
  player,
  from,
  onClose,
  onCopyId,
}: {
  player: AdminPlayer
  from: string
  onClose: () => void
  onCopyId: () => void
}) {
  const client = useQueryClient(),
    games = useAdminPlayerGames(player.id),
    profile = useAdminPlayerProfile(player.id),
    photo = usePhotoViewer(),
    { edit, isError, refetch, reset } = usePlayerEdit(player.id, {
      onDone: onClose,
      // Stale revision: load what is current, then edit again.
      onReload: () => {
        void client.invalidateQueries()
        reset()
        onClose()
      },
    })
  return (
    <>
      <AdminPlayerQuickView
        linkComponent={Link}
        initialMode="edit"
        open
        onClose={() => {
          reset()
          onClose()
        }}
        player={player}
        error={isError || profile.isError}
        onRetry={() => {
          refetch()
          void profile.refetch()
        }}
        createdBy={edit?.createdBy ?? 'Admin'}
        sessions={games.data}
        gamesError={games.isError}
        onRetryGames={() => void games.refetch()}
        profileHref={`/players/${player.id}?from=${encodeURIComponent(from)}`}
        historyHref={`/players/${player.id}?tab=history&from=${encodeURIComponent(from)}`}
        socialLinks={profile.data?.socialLinks}
        edit={edit}
        onViewPhoto={photo.show}
        onCopyId={onCopyId}
      />
      {photo.viewerProps ? <PhotoViewer {...photo.viewerProps} /> : null}
    </>
  )
}
