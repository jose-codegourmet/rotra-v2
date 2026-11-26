import type { ComponentMeta } from '@rotra/ui/meta'

export const baggingPairsCardMeta = {
  name: 'BaggingPairsCard',
  description:
    'The Bagging pairs list under the Generate matches header while Bagging mode is on: count, helper, Add pair, one row per pair with its games row and Remove (#739).',
  usage: [
    'Rendered by AutoQueueWorkspace while the Bagging mode switch is on; doubles sessions only, Queue Master only.',
    'Pairs guide Generate matches drafts only. Auto Queue (court filling), Suggest, Add match and Make match never read them.',
    'Every pair picture carries the level ring (Beginner, Intermediate, Advanced; grey with no level); hover names the level.',
    'Add pair opens BaggingPairSheet. Remove acts at once with the toast "Pair removed · A and B".',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Live console › Queue tab › Generate matches › Bagging pairs card',
  },
  docs: [
    'docs/screens/product/modules/queue/match-queue.md',
    'docs/mockup-changes/2026-11-19-queue-bagging-exempt-rings.md',
    'docs/business_logic/product/queue/modules/queueing/README.md',
  ],
  variants: ['empty', 'with-pairs'],
  related: ['BaggingPairSheet', 'BaggingGamesRow', 'AutoQueueWorkspace'],
} satisfies ComponentMeta
