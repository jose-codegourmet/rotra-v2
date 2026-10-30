import type { AdminClubAccessFilter } from '@rotra/data/club/types'
import { ClubDirectory } from './_components/club-directory/ClubDirectory'

const ACCESS_FILTERS: AdminClubAccessFilter[] = ['all', 'active', 'expired', 'none']

export default async function ClubsPage(props: PageProps<'/clubs'>) {
  const search = await props.searchParams
  const q = typeof search.q === 'string' ? search.q : ''
  const access = ACCESS_FILTERS.find((filter) => filter === search.access) ?? 'all'
  return <ClubDirectory q={q} access={access} />
}
