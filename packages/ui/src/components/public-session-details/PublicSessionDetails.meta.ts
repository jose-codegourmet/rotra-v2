import type { ComponentMeta } from '@rotra/ui/meta'

export const publicSessionDetailsMeta = {
  name: 'PublicSessionDetails',
  description:
    'The public page\'s Details tab: a card with When, Venue, Courts, Formats, Mode, Minimum and Payment rows, the session notes, and the "Slots are confirmed with the Queue Master directly. Last updated HH:MM." footer.',
  usage: [
    'Use for the Details tab of the public session page (Q-PUBLIC-DETAILS), in the operator preview and on the real public page.',
    'Pass already-formatted strings for When and the last-updated time; the component only lays them out. Set hasPendingChanges when the server knows venue changes are still waiting to sync; never call stale data "Live".',
    'Payment is the per-player amount only (amountDuePerPlayer in centavos): "₱200 per player · paid at the venue", "Free" at 0, row omitted when null. Never costs, totals or paid states. The venue is the session venue, never the club founding location.',
    'Signed-in viewers of a live session pass courtsNow (read-only CourtCard per entry, names per the public rule, no score or running time) and queueSlot (PublicSessionQueue); visitors pass neither and the Queue slot shows the login line.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Public page › viewPublic() › Details tab (.card.stack > dl.kv), courtsNow()',
  },
  docs: [
    'docs/screens/product/modules/queue/public-session.md',
    'docs/business_logic/product/queue/README.md',
  ],
  related: [
    'PublicSessionHero',
    'PublicParticipants',
    'PublicRefreshBar',
    'PublicSessionQueue',
    'CourtCard',
    'KeyValueList',
    'Card',
  ],
} satisfies ComponentMeta
