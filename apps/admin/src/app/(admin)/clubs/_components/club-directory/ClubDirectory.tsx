'use client'

import type { AdminClubAccessFilter, AdminClubList } from '@rotra/data/club/types'
import { useAdminClubs } from '@rotra/data/club/useAdminClubs'
import { Card } from '@rotra/ui/card'
import { DataTable } from '@rotra/ui/data-table'
import { PageHeader } from '@rotra/ui/page-header'
import { SegmentedControl } from '@rotra/ui/segmented-control'
import { TextInput } from '@rotra/ui/text-input'
import { usePathname, useRouter } from 'next/navigation'
import { useMemo, useRef, useState } from 'react'
import { clubDirectoryColumns } from './ClubDirectory.columns'

/** The directory's search and filter as a query string ("q=PH-DVO&access=expired"); '' when unset. */
function directoryQuery(q: string, access: AdminClubAccessFilter): string {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (access !== 'all') params.set('access', access)
  return params.toString()
}

/** The club's detail URL; `from` brings the back link to the same search and filter. */
function clubHref(id: string, query: string): string {
  return query ? `/clubs/${id}?from=${encodeURIComponent(query)}` : `/clubs/${id}`
}

/** A-CLUBS: searchable, filterable club directory; search and filter live in the URL. */
export function ClubDirectory({
  q: initialQ,
  access: initialAccess,
}: {
  q: string
  access: AdminClubAccessFilter
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [q, setQ] = useState(initialQ)
  const [access, setAccess] = useState(initialAccess)
  const list = useAdminClubs({ q: q.trim(), access })
  // Each keystroke is a new query; keep the last rows on screen until its answer arrives.
  const lastData = useRef<AdminClubList | undefined>(undefined)
  if (list.data) lastData.current = list.data
  const data = list.data ?? lastData.current
  const query = directoryQuery(q, access)
  const columns = useMemo(() => clubDirectoryColumns((club) => clubHref(club.id, query)), [query])

  const update = (nextQ: string, nextAccess: AdminClubAccessFilter) => {
    setQ(nextQ)
    setAccess(nextAccess)
    const next = directoryQuery(nextQ, nextAccess)
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false })
  }
  const counts = data?.counts

  return (
    <>
      <PageHeader
        title="Clubs and licenses"
        description="Club accounts, their prices and license terms, and what happens to their public pages after a license ends. Clubs pay outside ROTRA; you record the payment here when you activate or renew."
      />
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="min-w-0 flex-[1_1_260px]">
          <TextInput
            type="search"
            aria-label="Search clubs"
            placeholder="Search by club name, username or city"
            value={q}
            onChange={(event) => update(event.target.value, access)}
          />
        </div>
        <SegmentedControl
          aria-label="Filter by access"
          value={access}
          onChange={(value) => update(q, value as AdminClubAccessFilter)}
          options={[
            { value: 'all', label: 'All', count: counts?.all },
            { value: 'active', label: 'Active', count: counts?.active },
            { value: 'expired', label: 'Expired', count: counts?.expired },
            { value: 'none', label: 'No license', count: counts?.none },
          ]}
        />
      </div>
      <Card asChild>
        <section>
          <DataTable
            aria-label="Clubs"
            columns={columns}
            data={data?.clubs ?? []}
            getRowId={(club) => club.id}
            onRowClick={(club) => router.push(clubHref(club.id, query))}
          />
        </section>
      </Card>
    </>
  )
}
