import { matchesAccountFilter, matchesAdminPlayerSearch, sameNameGroups } from './adminPlayer.rules'
import type { AdminPlayer, AdminPlayerListParams, AdminPlayerStats } from './adminPlayer.types'

export function levelBandOf(index: number | null): AdminPlayer['levelBand'] {
  if (index === null || !Number.isInteger(index) || index < 0 || index > 8) return null
  return index < 3 ? 'beginner' : index < 6 ? 'intermediate' : 'advanced'
}
const normalize = (value: string) => value.trim().toLocaleLowerCase().replace(/\s+/g, ' ')
const phone = (value: string) => value.replace(/\D/g, '').replace(/^0/, '63')
/** Connected duplicate groups keep overlapping name/contact matches together without merging records. */
export function duplicateGroups(
  rows: readonly Pick<AdminPlayer, 'id' | 'name' | 'phone' | 'email'>[],
) {
  const groups: { ids: string[]; reasons: string[] }[] = []
  const seen = new Map<string, string[]>()
  for (const row of rows)
    for (const [reason, value] of [
      ['Same name', normalize(row.name)],
      ['Same phone', phone(row.phone ?? '')],
      ['Same email', normalize(row.email ?? '')],
    ]) {
      if (!value) continue
      const key = `${reason}:${value}`
      seen.set(key, [...(seen.get(key) ?? []), row.id])
    }
  for (const [key, ids] of seen) {
    if (ids.length < 2) continue
    const overlaps = groups.filter((group) => group.ids.some((id) => ids.includes(id)))
    const merged = {
      ids: [...new Set([...ids, ...overlaps.flatMap((g) => g.ids)])],
      reasons: [...new Set([key.split(':')[0] ?? '', ...overlaps.flatMap((g) => g.reasons)])],
    }
    for (const group of overlaps) groups.splice(groups.indexOf(group), 1)
    groups.push(merged)
  }
  return groups
}
export function adminPlayerStats(rows: readonly AdminPlayer[]): AdminPlayerStats {
  const stats = {
    advanced: 0,
    intermediate: 0,
    beginner: 0,
    noRank: 0,
    registered: 0,
    unclaimed: 0,
  }
  for (const row of rows) {
    stats[row.levelBand ?? 'noRank']++
    stats[row.claimed ? 'registered' : 'unclaimed']++
  }
  return stats
}
export function selectAdminPlayers(all: AdminPlayer[], params: AdminPlayerListParams = {}) {
  const groups = duplicateGroups(all)
  const duplicateIds = new Set(groups.flatMap((g) => g.ids))
  const matches = all
    .filter(
      (p) =>
        matchesAccountFilter(p.claimed, params.account) &&
        matchesAdminPlayerSearch(p, params.q) &&
        (!params.level ||
          (params.level === 'none' ? p.levelBand === null : p.levelBand === params.level)) &&
        (!params.duplicates || duplicateIds.has(p.id)) &&
        (!params.addedFrom || p.addedOn >= params.addedFrom) &&
        (!params.addedTo || p.addedOn <= params.addedTo) &&
        (!params.place?.length || params.place.includes(p.registeredPlace.code)) &&
        (params.archived === 'all' ||
          (params.archived === 'archived' ? !!p.archivedAt : !p.archivedAt)),
    )
    .sort((a, b) => b.addedOn.localeCompare(a.addedOn) || a.id.localeCompare(b.id))
  if (params.duplicates)
    matches.sort(
      (a, b) =>
        groups.findIndex((g) => g.ids.includes(a.id)) -
        groups.findIndex((g) => g.ids.includes(b.id)),
    )
  const pageSize = [25, 50, 100].includes(params.pageSize ?? params.limit ?? 25)
    ? (params.pageSize ?? params.limit ?? 25)
    : 25
  const pages: AdminPlayer[][] = []
  if (params.duplicates) {
    for (const group of groups) {
      const members = matches.filter((p) => group.ids.includes(p.id))
      if (!members.length) continue
      const last = pages.at(-1)
      if (last && last.length + members.length <= pageSize) last.push(...members)
      else pages.push(members)
    }
  } else
    for (let offset = 0; offset < matches.length; offset += pageSize)
      pages.push(matches.slice(offset, offset + pageSize))
  const pageCount = Math.max(1, pages.length)
  const requested = Number.isFinite(params.page) ? Math.floor(params.page ?? 1) : 1
  const page = Math.min(pageCount, Math.max(1, requested))
  const rows = pages[page - 1] ?? []
  const start = matches.length
    ? pages.slice(0, page - 1).reduce((sum, rows) => sum + rows.length, 0) + 1
    : 0
  const registered = all.filter((p) => p.claimed).length
  return {
    rows,
    start,
    end: start ? start + rows.length - 1 : 0,
    total: matches.length,
    page,
    pageSize,
    pageCount,
    stats: adminPlayerStats(matches),
    matchingIds: matches.map((p) => p.id),
    duplicateGroups: groups.filter((g) => g.ids.some((id) => rows.some((p) => p.id === id))),
    duplicateNames: sameNameGroups(matches),
    counts: { all: all.length, registered, unclaimed: all.length - registered },
    places: [...new Map(all.map((p) => [p.registeredPlace.code, p.registeredPlace])).values()],
  }
}

/** CSV quotes every field and prevents spreadsheet formula execution; contacts are never exported. */
export function adminPlayersCsv(players: readonly AdminPlayer[]) {
  const cell = (value: string) =>
    `"${(/^[=+@\-\t\r]/.test(value) ? "'" : '') + value.replaceAll('"', '""')}"`
  return [
    ['Name', 'Nickname', 'RTR ID', 'Account', 'Rank', 'Clubs', 'Added', 'Place'],
    ...players.map((p) => [
      p.name,
      p.nickname ?? '',
      p.rtrId,
      p.claimed ? 'Registered' : 'Unclaimed',
      p.rankStatus.text,
      p.clubs.map((c) => c.name).join('; '),
      p.addedOn,
      p.registeredPlace.name,
    ]),
  ]
    .map((row) => row.map(cell).join(','))
    .join('\r\n')
}
