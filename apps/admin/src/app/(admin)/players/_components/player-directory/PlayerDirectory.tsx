'use client'
import { useAdminConnectivity } from '@rotra/data/admin-account/use-admin-connectivity'
import type { AdminPlayerListParams } from '@rotra/data/admin-player/types'
import { useAdminPlayer, useAdminPlayerProfile } from '@rotra/data/admin-player/useAdminPlayer'
import { useAdminPlayerGames } from '@rotra/data/admin-player/useAdminPlayerGames'
import { useAdminPlayerMutations } from '@rotra/data/admin-player/useAdminPlayerMutations'
import { useAdminPlayers } from '@rotra/data/admin-player/useAdminPlayers'
import { appOrigin } from '@rotra/data/app-origins'
import { useAdminClubs } from '@rotra/data/club/useAdminClubs'
import { useContactRequests } from '@rotra/data/contact-change-request/useContactRequests'
import { AdminPlayerCard } from '@rotra/ui/admin-player-card'
import { AdminPlayerFilters } from '@rotra/ui/admin-player-filters'
import { AdminPlayerQuickView } from '@rotra/ui/admin-player-quick-view'
import { AdminPlayerStats } from '@rotra/ui/admin-player-stats'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { Checkbox } from '@rotra/ui/checkbox'
import { CopyPlayerValue } from '@rotra/ui/copy-player-value'
import { EmptyState } from '@rotra/ui/empty-state'
import { ErrorState } from '@rotra/ui/error-state'
import { usePhotoViewer } from '@rotra/ui/hooks/use-photo-viewer'
import { PageHeader } from '@rotra/ui/page-header'
import { PhotoViewer } from '@rotra/ui/photo-viewer'
import { PlayerPagination } from '@rotra/ui/player-pagination'
import { SameNameNotice } from '@rotra/ui/same-name-notice'
import { Skeleton } from '@rotra/ui/skeleton'
import { toast } from '@rotra/ui/toaster'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { useDenyOnPermissionError } from '../../../_components/admin-workspace-shell/AdminWorkspaceShell'
import { AddAdminPlayer } from '../add-admin-player/AddAdminPlayer'
import { PlayerBulkActions } from '../player-bulk-actions/PlayerBulkActions'
import { usePlayerEdit } from '../player-edit/usePlayerEdit'
import { PlayerManagementActions } from '../player-management-actions/PlayerManagementActions'
import { directoryFilters, writeDirectoryFilters } from './PlayerDirectory.url'
export function PlayerDirectory() {
  const photo = usePhotoViewer()
  const router = useRouter(),
    search = useSearchParams(),
    filters = directoryFilters(new URLSearchParams(search.toString()))
  const [selected, setSelected] = useState<string[]>([])
  const [copyValue, setCopyValue] = useState('')
  const [registration, setRegistration] = useState<{ playerId: string; url: string } | null>(null)
  const { offline } = useAdminConnectivity()
  const mutations = useAdminPlayerMutations()
  const client = useQueryClient()
  const filterKey = JSON.stringify({ ...filters, page: undefined, pageSize: undefined })
  const [selectionFilter, setSelectionFilter] = useState(filterKey)
  useEffect(() => {
    if (selectionFilter !== filterKey) {
      setSelectionFilter(filterKey)
      if (selected.length) toast('Selection cleared because filters changed')
      setSelected([])
    }
  }, [filterKey, selectionFilter, selected.length])
  const select = useCallback(
    (id: string, checked: boolean) =>
      setSelected((current) =>
        checked ? [...new Set([...current, id])] : current.filter((value) => value !== id),
      ),
    [],
  )
  const [rememberedView, setRememberedView] = useState('list')
  useEffect(() => {
    try {
      setRememberedView(localStorage.getItem('rotra-admin-players-view') ?? 'list')
    } catch {}
  }, [])
  const view = (search.get('view') ?? rememberedView) === 'grid' ? 'grid' : 'list'
  const list = useAdminPlayers(filters),
    clubs = useAdminClubs()
  const peek = search.get('peek') ?? '',
    playerQuery = useAdminPlayer(peek, { enabled: !!peek }),
    games = useAdminPlayerGames(peek),
    profile = useAdminPlayerProfile(peek),
    requests = useContactRequests({ playerId: peek }),
    edit = usePlayerEdit(peek, {
      enabled: !!peek,
      onDone: () => closePeek(),
      // Stale revision: load what is current, then edit again.
      onReload: () => {
        void client.invalidateQueries()
        closePeek()
      },
    })
  const denied = useDenyOnPermissionError(
    list.error,
    clubs.error,
    playerQuery.error,
    games.error,
    profile.error,
  )
  const data = list.data,
    query = search.toString()
  const openPeek = useCallback(
    (id: string) => {
      const params = new URLSearchParams(search.toString())
      params.set('peek', id)
      router.push(`/players?${params}`, { scroll: false })
    },
    [search, router],
  )
  const returnParams = new URLSearchParams(query)
  returnParams.delete('peek')
  const from = returnParams.toString()
  const href = (id: string) => `/players/${id}?from=${encodeURIComponent(from)}`
  const closePeek = () => {
    edit.reset()
    mutations.link.reset()
    setRegistration(null)
    const params = new URLSearchParams(query)
    params.delete('peek')
    router.replace(`/players${params.size ? `?${params.toString()}` : ''}`, { scroll: false })
  }
  const navigate = (params: URLSearchParams) =>
    router.push(`/players${params.size ? `?${params.toString()}` : ''}`, { scroll: false })
  const update = (patch: Partial<AdminPlayerListParams>) =>
    navigate(writeDirectoryFilters(new URLSearchParams(query), { ...patch, page: patch.page ?? 1 }))
  const clear = () => navigate(new URLSearchParams())
  if (denied) return null
  return (
    <div className={selected.length ? 'flex flex-col gap-5 pb-72 sm:pb-48' : 'flex flex-col gap-5'}>
      <CopyPlayerValue value={copyValue} onClose={() => setCopyValue('')} />
      <PageHeader
        title="Players"
        actions={<AddAdminPlayer onCreated={clear} />}
        description={
          data
            ? `${data.total} player${data.total === 1 ? '' : 's'} · permanent RTR IDs`
            : 'Players · permanent RTR IDs'
        }
        className="flex-nowrap [&>div:last-child]:!flex [&>div:last-child]:!w-auto [&>div:last-child]:shrink-0"
      />
      {!list.isError ? (
        <AdminPlayerStats stats={data?.stats} filters={filters} onChange={update} />
      ) : null}
      <AdminPlayerFilters
        filters={filters}
        places={data?.places ?? []}
        onChange={update}
        onClear={clear}
        view={view}
        onViewChange={(next) => {
          try {
            localStorage.setItem('rotra-admin-players-view', next)
          } catch {}
          setRememberedView(next)
          const params = new URLSearchParams(query)
          params.set('view', next)
          navigate(params)
        }}
      />
      {filters.duplicates
        ? data?.duplicateGroups.map((group) => (
            <SameNameNotice
              key={group.ids.join(',')}
              variant="list"
              matchReasons
              groups={[{ name: group.reasons.join(' / '), count: group.ids.length }]}
            />
          ))
        : null}
      {data && !list.isError ? (
        <div className="mb-3 flex flex-wrap items-center gap-2.5 rounded-lg border border-border px-3 py-2">
          <Checkbox
            className="border-0 bg-transparent p-0 text-[13px] [&_b]:font-normal"
            label="Select all on this page"
            disabled={list.isPlaceholderData || !data.rows.length}
            checked={!!data.rows.length && data.rows.every((p) => selected.includes(p.id))}
            onChange={(checked) =>
              setSelected((current) =>
                checked
                  ? [...new Set([...current, ...data.rows.map((p) => p.id)])]
                  : current.filter((id) => !data.rows.some((p) => p.id === id)),
              )
            }
          />
          <Button
            size="xs"
            disabled={list.isPlaceholderData}
            onClick={() => setSelected(data.matchingIds)}
          >
            Select all {data.total} matching
          </Button>
        </div>
      ) : null}
      {!list.isError && data?.rows.length ? (
        <div
          className={
            view === 'grid'
              ? 'grid grid-cols-[repeat(auto-fill,minmax(min(100%,148px),1fr))] gap-2.5'
              : 'grid grid-cols-1 gap-3'
          }
        >
          {data.rows.map((p) => (
            <AdminPlayerCard
              key={p.id}
              player={p}
              view={view}
              selected={selected.includes(p.id)}
              onSelect={(checked) => select(p.id, checked)}
              actions={<PlayerManagementActions player={p} />}
              createdBy={
                clubs.data?.clubs.find((c) => c.id === p.createdByClubId)?.name ??
                'Created by Admin'
              }
              href={href(p.id)}
              onOpen={() => openPeek(p.id)}
            />
          ))}
        </div>
      ) : list.isError ? (
        <Card>
          <ErrorState title="Couldn't load the players." onRetry={() => void list.refetch()} />
        </Card>
      ) : !data ? (
        <Card>
          <Skeleton label="Loading players" />
        </Card>
      ) : (
        <Card>
          <EmptyState
            title="No players match."
            action={<Button onClick={clear}>Clear filters</Button>}
          >
            Check the spelling or try the full RTR ID.
          </EmptyState>
        </Card>
      )}
      {data && !list.isError ? (
        <PlayerPagination
          variant="directory"
          start={data.start}
          end={data.end}
          page={data.page}
          pageCount={data.pageCount}
          pageSize={data.pageSize}
          total={data.total}
          pending={list.isPlaceholderData}
          onPage={(page) => update({ page })}
          onPageSize={(pageSize) => update({ pageSize })}
        />
      ) : null}
      {selected.length ? (
        <PlayerBulkActions ids={selected} onClear={() => setSelected([])} />
      ) : null}
      <AdminPlayerQuickView
        linkComponent={Link}
        actions={
          playerQuery.data ? <PlayerManagementActions player={playerQuery.data} /> : undefined
        }
        open={!!peek}
        onClose={closePeek}
        player={playerQuery.data === null ? null : profile.isPending ? undefined : playerQuery.data}
        error={playerQuery.isError || profile.isError}
        onRetry={() => {
          void playerQuery.refetch()
          void profile.refetch()
        }}
        createdBy={
          clubs.data?.clubs.find((c) => c.id === playerQuery.data?.createdByClubId)?.name ??
          'Created by Admin'
        }
        pendingRequests={requests.data?.rows.filter((r) => r.status === 'pending').length}
        sessions={games.data}
        gamesError={games.isError}
        onRetryGames={() => void games.refetch()}
        profileHref={href(peek)}
        historyHref={`/players/${peek}?tab=history&from=${encodeURIComponent(from)}`}
        socialLinks={profile.data?.socialLinks}
        onViewPhoto={photo.show}
        edit={playerQuery.data ? edit.edit : undefined}
        onInvite={
          !offline && playerQuery.data
            ? () => {
                const player = playerQuery.data
                if (!player) return
                setRegistration(null)
                mutations.link.reset()
                mutations.link.mutate(player.id, {
                  onSuccess: (link) => {
                    const base = appOrigin('player')
                    setRegistration({ playerId: peek, url: `${base}/claim/${link.token}` })
                  },
                })
              }
            : undefined
        }
        registrationLink={registration?.playerId === peek ? registration.url : undefined}
        invitePending={mutations.link.variables === peek && mutations.link.isPending}
        inviteError={mutations.link.variables === peek ? mutations.link.error?.message : undefined}
        onCopyRegistrationLink={() => {
          const value = registration?.playerId === peek ? registration.url : ''
          if (!value) return
          void Promise.resolve()
            .then(() => navigator.clipboard.writeText(value))
            .then(
              () => toast.success('Registration link copied'),
              () => setCopyValue(value),
            )
        }}
        onCopyId={() => {
          void Promise.resolve()
            .then(() => navigator.clipboard.writeText(playerQuery.data?.rtrId ?? ''))
            .then(
              () => toast.success('RTR ID copied'),
              () => setCopyValue(playerQuery.data?.rtrId ?? ''),
            )
        }}
      />
      {photo.viewerProps ? <PhotoViewer {...photo.viewerProps} /> : null}
    </div>
  )
}
