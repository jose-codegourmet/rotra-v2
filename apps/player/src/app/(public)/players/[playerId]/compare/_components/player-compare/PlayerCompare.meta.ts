import type { ComponentMeta } from '@rotra/ui/meta'

export const playerCompareMeta = {
  name: 'PlayerCompare',
  description:
    'P-COMPARE: a signed-in player compares their rank and counted shared games with another player.',
  usage: [
    'The filter resets pagination; statistics use the full filtered result, while the list shows three games per page.',
    'Signed-out visitors return after sign-in; a self-comparison returns to the profile.',
    'Character references are resolved to images for both players and every shared-game participant.',
  ],
  prototype: { file: 'apps/mockup/player-app/rotra-player.html', screen: 'Compare (viewCompare)' },
  docs: ['docs/screens/product/modules/player-information/profile.md'],
  variants: ['all', 'head-to-head', 'together', 'empty', 'loading', 'error'],
} satisfies ComponentMeta
