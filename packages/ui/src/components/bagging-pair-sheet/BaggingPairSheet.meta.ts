import type { ComponentMeta } from '@rotra/ui/meta'

export const baggingPairSheetMeta = {
  name: 'BaggingPairSheet',
  description:
    'D-BAGGING-PAIR: the wide Add bagging pair sheet with two selection slots, the Games row and a paginated grid of present players to tap into a pair (#739).',
  usage: [
    'Opened by Add pair on the Bagging pairs card in the Generate matches workspace.',
    'Pass every present roster player and the pairs already listed; a pick who is already paired shows the replace notice and the primary reads Replace pair.',
    'Add pair stays disabled until both slots are filled. Tiles show the first name only; the ring colour is the level, which the accessible name also carries.',
    'The caller adds the pair (removing any pair either player was in) and toasts "Bagging pair added · A and B".',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Live console › Queue tab › Generate matches › Add bagging pair',
  },
  docs: [
    'docs/screens/product/dialogs.md',
    'docs/screens/product/modules/queue/match-queue.md',
    'docs/business_logic/product/queue/modules/queueing/README.md',
  ],
  variants: ['empty', 'one-picked', 'two-picked', 'replace-pair', 'too-few-present', 'paginated'],
  related: ['BaggingPairsCard', 'BaggingGamesRow', 'Sheet', 'PublicParticipantTile'],
} satisfies ComponentMeta
