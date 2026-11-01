import type { AdminPlayerListParams } from '@rotra/data/admin-player/types'
export function directoryFilters(search: URLSearchParams): AdminPlayerListParams {
  const [addedFrom, addedTo] = (search.get('added') ?? '').split('..')
  const account = search.get('account'),
    level = search.get('level'),
    archived = search.get('archived')
  const size = Number(search.get('size') ?? search.get('shown') ?? 25)
  return {
    q: search.get('q') ?? '',
    account: account === 'registered' || account === 'unclaimed' ? account : 'all',
    level:
      level === 'beginner' || level === 'intermediate' || level === 'advanced' || level === 'none'
        ? level
        : undefined,
    duplicates: search.get('dup') === '1',
    addedFrom: /^\d{4}-\d{2}-\d{2}$/.test(addedFrom ?? '') ? addedFrom : undefined,
    addedTo: /^\d{4}-\d{2}-\d{2}$/.test(addedTo ?? '') ? addedTo : undefined,
    place: (search.get('place') ?? '').split(',').filter(Boolean),
    archived: archived === 'all' || archived === 'archived' ? archived : 'active',
    page: Math.max(1, Math.floor(Number(search.get('page')) || 1)),
    pageSize: [25, 50, 100].includes(size) ? size : 25,
  }
}
export function writeDirectoryFilters(
  search: URLSearchParams,
  patch: Partial<AdminPlayerListParams>,
) {
  const f = { ...directoryFilters(search), ...patch }
  search.delete('shown')
  const values: Record<string, string | undefined> = {
    q: f.q,
    account: f.account === 'all' ? undefined : f.account,
    level: f.level,
    dup: f.duplicates ? '1' : undefined,
    added: f.addedFrom || f.addedTo ? `${f.addedFrom ?? ''}..${f.addedTo ?? ''}` : undefined,
    place: f.place?.join(','),
    archived: f.archived === 'active' ? undefined : f.archived,
    page: f.page === 1 ? undefined : String(f.page),
    size: f.pageSize === 25 ? undefined : String(f.pageSize),
  }
  for (const [key, value] of Object.entries(values))
    if (value) search.set(key, value)
    else search.delete(key)
  return search
}
