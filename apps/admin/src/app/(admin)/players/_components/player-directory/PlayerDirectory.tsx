'use client'
import type { AdminPlayerListParams } from '@rotra/data/admin-player/types'
import { useAdminPlayer } from '@rotra/data/admin-player/useAdminPlayer'
import { useAdminPlayerGames } from '@rotra/data/admin-player/useAdminPlayerGames'
import { useAdminPlayers } from '@rotra/data/admin-player/useAdminPlayers'
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
import { DataTable } from '@rotra/ui/data-table'
import { EmptyState } from '@rotra/ui/empty-state'
import { ErrorState } from '@rotra/ui/error-state'
import { PageHeader } from '@rotra/ui/page-header'
import { PlayerPagination } from '@rotra/ui/player-pagination'
import { SameNameNotice } from '@rotra/ui/same-name-notice'
import { SegmentedControl } from '@rotra/ui/segmented-control'
import { toast } from '@rotra/ui/toaster'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDenyOnPermissionError } from '../../../_components/admin-workspace-shell/AdminWorkspaceShell'
import { AddAdminPlayer } from '../add-admin-player/AddAdminPlayer'
import { PlayerBulkActions } from '../player-bulk-actions/PlayerBulkActions'
import { PlayerManagementActions } from '../player-management-actions/PlayerManagementActions'
import { playerDirectoryColumns } from './PlayerDirectory.columns'
import { directoryFilters, writeDirectoryFilters } from './PlayerDirectory.url'
export function PlayerDirectory() {
  const router = useRouter(),
    search = useSearchParams(),
    filters = directoryFilters(new URLSearchParams(search.toString()))
  const [selected, setSelected] = useState<string[]>([])
  const [copyValue, setCopyValue] = useState('')
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
  const view = search.get('view') ?? rememberedView
  const list = useAdminPlayers(filters),
    clubs = useAdminClubs()
  const peek = search.get('peek') ?? '',
    playerQuery = useAdminPlayer(peek, { enabled: !!peek }),
    games = useAdminPlayerGames(peek),
    requests = useContactRequests({ playerId: peek })
  const denied = useDenyOnPermissionError(list.error, clubs.error, playerQuery.error, games.error)
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
  const href = (id: string) => `/players/${id}?from=${encodeURIComponent(query)}`
  const columns = useMemo(
    () =>
      playerDirectoryColumns(
        (p) => `/players/${p.id}?from=${encodeURIComponent(query)}`,
        (id) => clubs.data?.clubs.find((c) => c.id === id)?.name ?? 'Created by Admin',
        (id) => openPeek(id),
        (p) => <PlayerManagementActions player={p} />,
        selected,
        select,
      ),
    [query, clubs.data, selected, select, openPeek],
  )
  const navigate = (params: URLSearchParams) =>
    router.push(`/players${params.size ? `?${params.toString()}` : ''}`, { scroll: false })
  const update = (patch: Partial<AdminPlayerListParams>) =>
    navigate(writeDirectoryFilters(new URLSearchParams(query), { ...patch, page: patch.page ?? 1 }))
  const clear = () => navigate(new URLSearchParams())
  if (denied) return null
  return (
    <>
      <CopyPlayerValue value={copyValue} onClose={() => setCopyValue('')} />
      <PageHeader
        title="Players"
        actions={<AddAdminPlayer onCreated={clear} />}
        description="Every player identity with a permanent RTR ID."
      />
      {!list.isError ? (
        <AdminPlayerStats stats={data?.stats} filters={filters} onChange={update} />
      ) : null}
      <AdminPlayerFilters
        filters={filters}
        places={data?.places ?? []}
        onChange={update}
        onClear={clear}
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
        <div className="flex flex-wrap gap-2">
          <Checkbox
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
          <Button disabled={list.isPlaceholderData} onClick={() => setSelected(data.matchingIds)}>
            Select all {data.total} matching
          </Button>
        </div>
      ) : null}
      <SegmentedControl
        aria-label="Player view"
        value={view}
        options={[
          { value: 'list', label: 'List' },
          { value: 'grid', label: 'Grid' },
        ]}
        onChange={(view) => {
          try {
            localStorage.setItem('rotra-admin-players-view', view)
          } catch {}
          setRememberedView(view)
          const params = new URLSearchParams(query)
          params.set('view', view)
          navigate(params)
        }}
      />
      {!list.isError && data?.rows.length ? (
        <div
          className={
            view === 'grid'
              ? 'grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3'
              : 'grid grid-cols-1 gap-3 min-[761px]:hidden'
          }
        >
          {data.rows.map((p) => (
            <AdminPlayerCard
              selected={selected.includes(p.id)}
              onSelect={(checked) => select(p.id, checked)}
              actions={<PlayerManagementActions player={p} />}
              key={p.id}
              player={p}
              createdBy={
                clubs.data?.clubs.find((c) => c.id === p.createdByClubId)?.name ??
                'Created by Admin'
              }
              href={href(p.id)}
              onOpen={() => openPeek(p.id)}
            />
          ))}
        </div>
      ) : null}
      <Card
        className={
          data?.rows.length && !list.isError
            ? view === 'grid'
              ? 'hidden'
              : 'max-[760px]:hidden'
            : undefined
        }
      >
        <DataTable
          aria-label="Players"
          columns={columns}
          data={data?.rows ?? []}
          getRowId={(p) => p.id}
          onRowClick={(p) => openPeek(p.id)}
          loading={!data && !list.isError}
          error={
            list.isError ? (
              <ErrorState title="Couldn't load the players." onRetry={() => void list.refetch()} />
            ) : undefined
          }
          empty={
            <EmptyState
              title="No players match."
              action={<Button onClick={clear}>Clear filters</Button>}
            >
              Check the spelling or try the full RTR ID.
            </EmptyState>
          }
        />
      </Card>
      {data && !list.isError ? (
        <PlayerPagination
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
        onClose={() => {
          const params = new URLSearchParams(query)
          params.delete('peek')
          router.replace(`/players?${params}`, { scroll: false })
        }}
        player={playerQuery.data}
        error={playerQuery.isError}
        onRetry={() => void playerQuery.refetch()}
        createdBy={
          clubs.data?.clubs.find((c) => c.id === playerQuery.data?.createdByClubId)?.name ??
          'Created by Admin'
        }
        pendingRequests={requests.data?.rows.filter((r) => r.status === 'pending').length}
        sessions={games.data}
        gamesError={games.isError}
        onRetryGames={() => void games.refetch()}
        profileHref={href(peek)}
        historyHref={`/players/${peek}/games?from=${encodeURIComponent(query)}&origin=list`}
        onCopyId={() => {
          void Promise.resolve()
            .then(() => navigator.clipboard.writeText(playerQuery.data?.rtrId ?? ''))
            .then(
              () => toast.success('RTR ID copied'),
              () => setCopyValue(playerQuery.data?.rtrId ?? ''),
            )
        }}
      />
    </>
  )
}
