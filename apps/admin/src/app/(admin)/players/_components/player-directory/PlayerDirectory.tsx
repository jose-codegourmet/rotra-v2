'use client'

import { ADMIN_PLAYER_PAGE_SIZE } from '@rotra/data/admin-player/rules'
import type { AdminPlayerAccountFilter } from '@rotra/data/admin-player/types'
import { useAdminPlayers } from '@rotra/data/admin-player/useAdminPlayers'
import { useAdminClubs } from '@rotra/data/club/useAdminClubs'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { DataTable } from '@rotra/ui/data-table'
import { PageHeader } from '@rotra/ui/page-header'
import { SameNameNotice } from '@rotra/ui/same-name-notice'
import { SegmentedControl } from '@rotra/ui/segmented-control'
import { TextInput } from '@rotra/ui/text-input'
import { usePathname, useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { useDenyOnPermissionError } from '../../../_components/admin-workspace-shell/AdminWorkspaceShell'
import { playerDirectoryColumns } from './PlayerDirectory.columns'

/** The directory's search, filter and shown count as a query string ("q=Jose&shown=50"); '' when unset. */
function directoryQuery(q: string, account: AdminPlayerAccountFilter, shown: number): string {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (account !== 'all') params.set('account', account)
  if (shown !== ADMIN_PLAYER_PAGE_SIZE) params.set('shown', String(shown))
  return params.toString()
}

/** The player's detail URL; `from` brings the back link to the same search, filter and shown count. */
function playerHref(id: string, query: string): string {
  return query ? `/players/${id}?from=${encodeURIComponent(query)}` : `/players/${id}`
}

const formatCount = (value: number) => value.toLocaleString('en-PH')

/**
 * A-PLAYERS: every player identity, searchable by name, RTR ID, phone or email (Admin only) and
 * filterable by account, 25 at a time; search, filter and shown count live in the URL. Duplicate names
 * in the results get a notice and are never merged. Loading, no-match and error states: A03.11.
 */
export function PlayerDirectory({
  q: initialQ,
  account: initialAccount,
  shown: initialShown,
}: {
  q: string
  account: AdminPlayerAccountFilter
  shown: number
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [q, setQ] = useState(initialQ)
  const [account, setAccount] = useState(initialAccount)
  const [shown, setShown] = useState(initialShown)
  // keepPreviousData: the last rows stay on screen while a new search or 25 more load.
  const list = useAdminPlayers({ q: q.trim(), account, limit: shown })
  // Same cache as the workspace nav count; names the club that created each identity.
  const clubs = useAdminClubs()
  const denied = useDenyOnPermissionError(list.error, clubs.error)
  const data = list.data
  const query = directoryQuery(q, account, shown)
  const clubNames = useMemo(
    () => new Map((clubs.data?.clubs ?? []).map((club) => [club.id, club.name])),
    [clubs.data],
  )
  const columns = useMemo(
    () =>
      playerDirectoryColumns(
        (player) => playerHref(player.id, query),
        (clubId) => (clubId === null ? undefined : clubNames.get(clubId)) ?? '—',
      ),
    [query, clubNames],
  )

  const update = (nextQ: string, nextAccount: AdminPlayerAccountFilter, nextShown: number) => {
    setQ(nextQ)
    setAccount(nextAccount)
    setShown(nextShown)
    const next = directoryQuery(nextQ, nextAccount, nextShown)
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false })
  }
  const counts = data?.counts
  const rows = data?.rows ?? []

  if (denied) return null

  return (
    <>
      <PageHeader
        title="Players"
        description="Every player identity with a permanent RTR ID. Guests a club only typed a name for stay in that club's records and aren't listed."
      />
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="min-w-0 flex-[1_1_260px]">
          <TextInput
            type="search"
            aria-label="Search players"
            placeholder="Search by name, RTR ID, phone or email"
            value={q}
            onChange={(event) => update(event.target.value, account, ADMIN_PLAYER_PAGE_SIZE)}
          />
        </div>
        <SegmentedControl
          aria-label="Filter by account"
          value={account}
          onChange={(value) => update(q, value as AdminPlayerAccountFilter, ADMIN_PLAYER_PAGE_SIZE)}
          options={[
            { value: 'all', label: 'All', count: counts?.all },
            { value: 'registered', label: 'Registered', count: counts?.registered },
            { value: 'unclaimed', label: 'Unclaimed', count: counts?.unclaimed },
          ]}
        />
      </div>
      <p className="m-0 text-xs text-fg2">
        Phone and email search is only available in Admin. Public search on Player Information never
        matches them.
      </p>
      {q.trim() !== '' && data ? (
        <SameNameNotice variant="list" groups={data.duplicateNames} />
      ) : null}
      <Card asChild>
        <section>
          <DataTable
            aria-label="Players"
            columns={columns}
            data={rows}
            getRowId={(player) => player.id}
            onRowClick={(player) => router.push(playerHref(player.id, query))}
          />
          {data && rows.length > 0 ? (
            <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
              <span className="text-[13px] text-fg2">
                Showing {formatCount(rows.length)} of {formatCount(data.total)}
              </span>
              {data.total > rows.length ? (
                <Button
                  size="sm"
                  disabled={list.isPlaceholderData}
                  onClick={() => update(q, account, shown + ADMIN_PLAYER_PAGE_SIZE)}
                >
                  Show 25 more
                </Button>
              ) : null}
            </div>
          ) : null}
        </section>
      </Card>
    </>
  )
}
