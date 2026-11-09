import type { ComponentMeta } from '@rotra/ui/meta'

export const pagerMeta = {
  name: 'Pager',
  description: 'Previous and Next controls for a paged collection.',
  usage: ['Use for simple pages without table page-size controls.'],
  prototype: { file: 'apps/mockup/player-app/rotra-player.html', screen: 'Profile picture sheet' },
  docs: ['docs/screens/product/modules/player-information/profile.md'],
  variants: ['first', 'middle', 'last'],
} satisfies ComponentMeta
