import { ADMIN_PLAYER_PAGE_SIZE } from '@rotra/data/admin-player/rules'
import type { AdminPlayerAccountFilter } from '@rotra/data/admin-player/types'
import { PlayerDirectory } from './_components/player-directory/PlayerDirectory'

const ACCOUNT_FILTERS: AdminPlayerAccountFilter[] = ['all', 'registered', 'unclaimed']

export default async function PlayersPage(props: PageProps<'/players'>) {
  const search = await props.searchParams
  const q = typeof search.q === 'string' ? search.q : ''
  const account = ACCOUNT_FILTERS.find((filter) => filter === search.account) ?? 'all'
  // Rows shown so far, in steps of 25; anything else falls back to the first page.
  const shownParam = typeof search.shown === 'string' ? Number(search.shown) : Number.NaN
  const shown =
    Number.isInteger(shownParam) && shownParam > ADMIN_PLAYER_PAGE_SIZE
      ? Math.ceil(shownParam / ADMIN_PLAYER_PAGE_SIZE) * ADMIN_PLAYER_PAGE_SIZE
      : ADMIN_PLAYER_PAGE_SIZE
  return <PlayerDirectory q={q} account={account} shown={shown} />
}
