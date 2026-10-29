import type { ComponentMeta } from '@rotra/ui/meta'

export const clubDirectoryMeta = {
  name: 'ClubDirectory',
  description:
    'A-CLUBS container: useAdminClubs with the search (q) and access filter (access) held in the URL, the Filter by access SegmentedControl with per-filter counts, and a DataTable of ClubCell, ClubPriceTag and LicenseAccessChip rows.',
  usage: [
    'Rendered by /clubs, which awaits searchParams q and access and passes them in. Typing or filtering router.replaces the query string.',
    'The club name and the whole row open /clubs/{id}?from={encoded q/access query}; the detail back link decodes from to restore the directory.',
    'Add club (A02.11) and the empty, loading and error states (A02.14) are not wired yet.',
  ],
  docs: ['docs/screens/product/modules/admin/clubs-licenses.md'],
  related: [
    'PageHeader',
    'DataTable',
    'SegmentedControl',
    'TextInput',
    'ClubCell',
    'ClubPriceTag',
    'LicenseAccessChip',
  ],
} satisfies ComponentMeta
