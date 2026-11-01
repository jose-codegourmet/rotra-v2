import type { ComponentMeta } from '@rotra/ui/meta'

export const courtCardMeta = {
  name: 'CourtCard',
  description:
    'One court in the live console. In game: label, closing time, "In game" or "Merged · in game", the teams on a court drawing, "FORMAT · Match N · M min · S substitutions" and Open match. Free: label, closing time or "Booking ended HH:MM", Free, an empty drawing, then the next eligible match (Review and start, Pick another) or why none can start (Add match). Not open yet: "Opens at …" and Start anyway. Edit, Undo early open and Remove sit in the ⋯ menu.',
  usage: [
    'Use for every court in Q-COURTS (Live console › Session tab) and the Courts grid. A 5v5 passes merged with both labels ("Court 1 + Court 2") and spans two grid rows.',
    'Pass only the callbacks whose buttons should show: Pick another only when more than one match waits.',
    'The card shows one action for its state (Start anyway, Review and start, Add match, Open match); Edit, Undo early open and Remove go in the ⋯ menu. On an in-game card Undo early open and Remove are disabled with their reason.',
    'Start anyway opens the court before its planned start; the owner confirms first ("Open Court 4 now?"). Pass openedEarly afterwards so the time line reads "Opened early · planned START – UNTIL", and onUndoEarlyOpen while it is still before the planned start.',
    'Booking ended is text in warn colour on a free card; the game on an in-game card keeps going past its closing time.',
    'The container formats times, labels and reasons (nextEligibleForCourt, matchStatus); the card never computes them.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Live console › Courts › courtsPane() (.court, .court.busy, .court.merged)',
  },
  docs: [
    'docs/screens/product/modules/queue/session-console.md',
    'docs/business_logic/product/queue/modules/sessions/README.md',
    'docs/business_logic/product/queue/modules/queueing/README.md',
  ],
  variants: ['in-game', 'free'],
  // Individual booking starts control dispatch; ends remain advisory.
  related: ['CourtDrawing', 'PlayerFaceButton', 'AddCourtTile', 'Chip', 'OverflowMenu'],
} satisfies ComponentMeta
