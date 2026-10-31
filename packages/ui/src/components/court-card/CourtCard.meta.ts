import type { ComponentMeta } from '@rotra/ui/meta'

export const courtCardMeta = {
  name: 'CourtCard',
  description:
    'One court in the live console. In game: label, closing time, "In game" or "Merged · in game", the teams on a court drawing, "FORMAT · Match N · M min · S substitutions" and Open match. Free: label, closing time or "Booking ended HH:MM", Free, Remove, an empty drawing, then the next eligible match (Review and start, Pick another) or why none can start (Add match).',
  usage: [
    'Use for every court in Q-COURTS (Live console › Session tab) and the Courts grid. A 5v5 passes merged with both labels ("Court 1 + Court 2") and spans two grid rows.',
    'Pass only the callbacks whose buttons should show: Pick another only when more than one match waits; Remove only on a free court (an occupied court cannot be removed).',
    'Booking ended is text in warn colour on a free card; the game on an in-game card keeps going past its closing time.',
    'The container formats times, labels and reasons (nextEligibleForCourt, matchStatus); the card never computes them.',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'Live console › Courts › courtsPane() (.court, .court.busy, .court.merged)',
  },
  docs: [
    'docs/screens/product/modules/queue/session-console.md',
    'docs/business_logic/product/queue/modules/sessions/README.md',
    'docs/business_logic/product/queue/modules/queueing/README.md',
  ],
  variants: ['in-game', 'free'],
  related: ['CourtDrawing', 'PlayerFaceButton', 'AddCourtTile', 'Chip'],
} satisfies ComponentMeta
