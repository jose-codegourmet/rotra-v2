import type { ComponentMeta } from '@rotra/ui/meta'

export const savedPlayersFilterBarMeta = {
  name: 'SavedPlayersFilterBar',
  description:
    'Search plus five filters for Saved players (Skill level, Registered in, Added, Account, Right now) with the results line and Clear filters.',
  usage: [
    'Controlled: pass value and onChange; DEFAULT_SAVED_PLAYERS_FILTERS resets everything.',
    'Right now options other than Anyone are disabled when no session is live.',
    'Sizes itself by its own width (container queries): one row > 1000 px, search on its own row then three across, two across ≤ 620 px, one column ≤ 340 px.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Q-SAVED-PLAYERS › .sp-tools-wrap, .sp-tools',
  },
  docs: ['docs/screens/product/modules/queue/access-home.md'],
  related: ['SavedPlayerCard', 'Select', 'TextInput'],
} satisfies ComponentMeta
