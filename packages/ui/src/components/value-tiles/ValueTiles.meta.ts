import type { ComponentMeta } from '@rotra/ui/meta'

export const valueTilesMeta = {
  name: 'ValueTiles',
  description:
    'A grid of small bordered tiles, each with a label, a value and an optional muted line: a club’s license price, or the ranking weights in effect.',
  usage: [
    'Use for a handful of read-only values on an Admin detail page; columns fit 150 px or wider and wrap to one column on phones.',
    'Set mono for numbers and prices; leave it off for words such as "Free".',
    'For label and value pairs in a list, use KeyValueList instead.',
  ],
  prototype: {
    file: 'app/mocksups-app/admin-app/rotra-admin.html',
    screen: 'A-CLUB-DETAIL › Price .tiles; A-RANK-CONFIG › In effect .tiles',
  },
  docs: [
    'docs/screens/product/modules/admin/clubs-licenses.md',
    'docs/screens/product/modules/admin/configuration.md',
  ],
  variants: ['mono', 'bold'],
  related: ['KeyValueList', 'ClubPriceTag'],
} satisfies ComponentMeta
