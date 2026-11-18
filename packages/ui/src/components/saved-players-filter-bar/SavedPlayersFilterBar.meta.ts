import type { ComponentMeta } from '@rotra/ui/meta'

export const savedPlayersFilterBarMeta = {
  name: 'SavedPlayersFilterBar',
  description:
    'Search plus five filters for Saved players (Skill level, Registered in, Added, Account, Right now) with the results line and Clear filters.',
  usage: [
    'Controlled: pass value and onChange; DEFAULT_SAVED_PLAYERS_FILTERS resets everything.',
    'The Account filter lists Everyone, Registered, Unclaimed, Details required and Guest (D-2026-11-16-04); status \'details\' is the older unclaimed records with no email.',
    'Right now options other than Anyone are disabled when no session is live.',
    'Sizes itself by its own width (container queries): one row > 1000 px, search on its own row then three across, two across ≤ 620 px, one column ≤ 340 px.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Q-SAVED-PLAYERS › .sp-tools-wrap, .sp-tools',
  },
  docs: ['docs/screens/product/modules/queue/access-home.md'],
  related: ['SavedPlayerCard', 'Select', 'TextInput'],
} satisfies ComponentMeta
