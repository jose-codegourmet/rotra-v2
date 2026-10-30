import type { ComponentMeta } from '@rotra/ui/meta'

export const clubDirectoryMeta = {
  name: 'ClubDirectory',
  description:
    'A-CLUBS container: useAdminClubs with the search (q) and access filter (access) held in the URL, the Filter by access SegmentedControl with per-filter counts, and a DataTable of ClubCell, ClubPriceTag and LicenseAccessChip rows.',
  usage: [
    'Rendered by /clubs, which awaits searchParams q and access and passes them in. Typing or filtering router.replaces the query string.',
    'The club name and the whole row open /clubs/{id}?from={encoded q/access query}; the detail back link decodes from to restore the directory.',
    'Add club (primary, PageHeader actions) opens AddClubSheet (A-ADD-CLUB).',
    'Loading: DataTable skeleton rows and no filter counts until the first answer (clubs/loading.tsx covers the route itself). While a new search is fetching, the previous rows stay.',
    'Empty: no clubs at all → "No clubs yet." with Add club; nothing matching → "No clubs match." with Clear search and filter when a search or filter is set.',
    'A failed load shows ErrorState with Retry inside the table and keeps the search and filter; a permission error replaces the workspace with the access denial (useDenyOnPermissionError).',
  ],
  docs: ['docs/screens/product/modules/admin/clubs-licenses.md'],
  related: [
    'PageHeader',
    'AddClubSheet',
    'DataTable',
    'SegmentedControl',
    'TextInput',
    'ClubCell',
    'ClubPriceTag',
    'LicenseAccessChip',
  ],
} satisfies ComponentMeta
