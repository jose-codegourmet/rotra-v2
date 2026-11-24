import type { ComponentMeta } from '@rotra/ui/meta'

export const publicSessionDetailsMeta = {
  name: 'PublicSessionDetails',
  description:
    'The public page\'s Details tab as cards: the lead cards When and Where, fact tiles (Courts, Formats, Mode, Levels, Scoring, Minimum, Payment, Results when not recorded), a Notes card, and the "Slots are confirmed with the Queue Master directly. Last updated HH:MM." footer.',
  usage: [
    'Use for the Details tab of the public session page (Q-PUBLIC-DETAILS), in the operator preview and on the real public page.',
    'Pass already-formatted strings (dateLabel "Sun, Oct 26", timeLabel "6:00 PM–9:00 PM · 3 h", and the last-updated time); the component only lays them out. Set hasPendingChanges when the server knows venue changes are still waiting to sync; never call stale data "Live".',
    'Pass recorded={false} for a session with Record games off: a Results tile reads "Not recorded" over "No results, standings or awards for this session." Omitted reads as recorded.',
    'scoringLabel is the Scoring tile\'s value (SCORING[key].label from @rotra/schema/scoring); omitted reads as 16/31. scoringDescription (SCORING[key].text) is its muted line.',
    'levelsLabel and levelsDescription fill the Levels tile (after Mode); omit them and the tile is left out. The restrictions ticket sets them from the session\'s levelRestriction.',
    'Payment is the per-player amount only (amountDuePerPlayer in centavos): "₱200" over "per player · paid at the venue", "Free" at 0, tile omitted when null. Never costs, totals or paid states. The venue is the session venue, never the club founding location.',
    'Signed-in viewers of a live session pass courtsNow (read-only CourtCard per entry, names per the public rule, no score or running time) and queueSlot (PublicSessionQueue); visitors pass neither and the Queue slot shows the login line.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Public page › viewPublic() › Details tab (.pub-details, .pf-lead, .pf-tile), courtsNow()',
  },
  docs: [
    'docs/screens/product/modules/queue/public-session.md',
    'docs/mockup-changes/2026-11-19-queue-public-details-cards.md',
    'docs/business_logic/product/queue/README.md',
  ],
  related: [
    'PublicSessionHero',
    'PublicParticipants',
    'PublicRefreshBar',
    'PublicSessionQueue',
    'CourtCard',
        'Card',
  ],
} satisfies ComponentMeta
