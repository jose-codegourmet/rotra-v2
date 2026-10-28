import type { ComponentMeta } from '@rotra/ui/meta'

export const publicSessionDetailsMeta = {
  name: 'PublicSessionDetails',
  description:
    'The public page\'s Details tab: a card with When, Venue, Courts, Formats, Mode and Minimum rows, the session notes, and the "Slots are confirmed with the Queue Master directly. Last updated HH:MM." footer.',
  usage: [
    'Use for the Details tab of the public session page (Q-PUBLIC-DETAILS), in the operator preview and on the real public page.',
    'Pass already-formatted strings for When and the last-updated time; the component only lays them out. Set hasPendingChanges when the server knows venue changes are still waiting to sync; never call stale data "Live".',
    'No fees, costs or payment states: the props have no such fields. The venue is the session venue, never the club founding location.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Public page › viewPublic() › Details tab (.card.stack > dl.kv)',
  },
  docs: [
    'docs/screens/product/modules/queue/public-session.md',
    'docs/business_logic/product/queue/README.md',
  ],
  related: ['PublicSessionHero', 'PublicParticipants', 'KeyValueList', 'Card'],
} satisfies ComponentMeta
