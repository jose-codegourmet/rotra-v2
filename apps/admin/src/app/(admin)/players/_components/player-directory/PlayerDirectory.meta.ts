import type { ComponentMeta } from '@rotra/ui/meta'

export const playerDirectoryMeta = {
  name: 'PlayerDirectory',
  description:
    'A-PLAYERS container: useAdminPlayers with the search (q), account filter (account) and shown count (shown) held in the URL, the Filter by account SegmentedControl with per-filter counts, the same-name notice while searching, and a DataTable of PlayerIdentityCell, PlayerAccountChip and RankStatusChip rows, 25 at a time.',
  usage: [
    'Rendered by /players, which awaits searchParams q, account and shown and passes them in. Typing or filtering router.replaces the query string and resets to 25 shown; Show 25 more raises shown.',
    'The player name and the whole row open /players/{id}?from={encoded q/account/shown query}; the detail back link uses from to restore the directory.',
    'Phone and email match only here (privileged Admin search); Player Information public search never matches them.',
    'Created by is the club whose roster first lists the player; "—" when no club record exists in the mock data.',
    'While a new search or 25 more load, the previous rows stay (keepPreviousData). Skeleton rows until the first answer (players/loading.tsx covers the route load).',
    'No match: "No players match “{q}”." with Clear search (resets search, filter and shown count); never offers to create a player. A failed load shows ErrorState with Retry and keeps the search, filter and shown count. A permission error denies the workspace (useDenyOnPermissionError).',
  ],
  docs: ['docs/screens/product/modules/admin/players-requests.md'],
  related: [
    'PageHeader',
    'DataTable',
    'EmptyState',
    'ErrorState',
    'SegmentedControl',
    'TextInput',
    'PlayerIdentityCell',
    'PlayerAccountChip',
    'RankStatusChip',
    'SameNameNotice',
  ],
} satisfies ComponentMeta
