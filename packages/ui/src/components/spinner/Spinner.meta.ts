import type { ComponentMeta } from '@rotra/ui/meta'

export const spinnerMeta = {
  name: 'Spinner',
  description: 'A small turning ring that shows work in progress, such as a pending save.',
  usage: [
    'Button shows it automatically while loading; use it directly only beside inline status text.',
    'For page or list loading use Skeleton, never a full-page spinner.',
  ],
  prototype: {
    file: 'app/mocksups-app/admin-app/rotra-admin.html',
    screen: 'Shared styles › .spin',
  },
  related: ['Button', 'Skeleton'],
} satisfies ComponentMeta
