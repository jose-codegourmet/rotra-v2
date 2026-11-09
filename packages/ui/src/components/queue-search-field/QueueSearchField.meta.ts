import type { ComponentMeta } from '@rotra/ui/meta'

export const queueSearchFieldMeta = {
  name: 'QueueSearchField',
  description: 'Find a player in the Main Queue, with a polite result count or no-match message.',
  usage: [
    'Pass the search value and count of matching waiting matches. QueueGrid applies the highlights.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Live console › Queue › Main Queue',
  },
  docs: ['docs/screens/product/modules/queue/match-queue.md'],
  related: ['TextInput', 'QueueGrid', 'MatchCard'],
} satisfies ComponentMeta
