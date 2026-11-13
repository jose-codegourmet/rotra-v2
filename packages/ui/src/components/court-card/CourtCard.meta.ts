import type { ComponentMeta } from '@rotra/ui/meta'

export const courtCardMeta = {
  name: 'CourtCard',
  description:
    'One court in the live console, in one of three states written as a chip. Free: label, closing time or "Booking ended HH:MM", chip "Free · N min" (minutes since the court became free: neutral under 10, warn from 10, error from 16; plain Free without freeMinutes) or Not open yet, an empty drawing, then the next eligible match (Put on court, Pick another) or why none can go on ("Not enough free players.", "No waiting match can go on: …", "The queue is empty.", then Add match). Getting ready (variant on-court): normal border, chip Getting ready, the teams on a court drawing, "FORMAT · Match N · waiting to start", primary Start match and secondary Open match. Playing (variant in-game): steady accent border glow, no pulse, chip Playing, "FORMAT · Match N · M min · S substitutions" and Open match. Swap with #P · Match N, Change court label, Edit (Change time while a match is on the court), Undo early open and Remove sit in the ⋯ menu.',
  usage: [
    'Use variant read-only for public court cards: pass the state, formatted start time and caller-masked names; no controls or running timer are shown.',
    'Use for every court in Q-COURTS (Live console › Session tab) and the Courts grid. A 5v5 passes merged with both labels ("Court 1 + Court 2") and spans two grid rows ("Merged · Getting ready", "Merged · Playing").',
    'variant "on-court" is a match On court (placed, not started): no minutes, because the timer starts at Start match. Pass blockedReason when a player is not present; it shows in warn and disables Start match.',
    'variant "in-game" is Playing (Match state active). The glow is steady; never animate it.',
    'Pass only the callbacks whose buttons should show: Pick another only when more than one match waits. On a free card pass onPutOnCourt ("Put on court"); onReviewAndStart is the deprecated pre-On-court label.',
    'On a Getting ready card the ⋯ menu starts with Swap: pass onSwap and swapWith ({ position, matchNo }) for "Swap with #P · Match N", or swapWith null to show "Swap with the queue" disabled with "No other waiting match is ready".',
    'The card shows only the actions for its state (Start anyway, Put on court, Add match, Start match, Open match); Edit, Undo early open and Remove go in the ⋯ menu. While a match is on the court (Getting ready or Playing) Edit reads "Change time" and stays enabled (the court sheet keeps a used start fixed; the match is not touched), Undo early open is disabled with "A match is on this court" and Remove with "Only a free court can be removed".',
    'Start anyway opens the court before its planned start; the owner confirms first ("Open Court 4 now?"). Pass openedEarly afterwards so the time line reads "Opened early · planned START – UNTIL", and onUndoEarlyOpen while it is still before the planned start.',
    'Booking ended is text in warn colour on every state; the game keeps going past its closing time and a free court can still be filled.',
    'Pass notEnoughFreePlayers when fewer players are free than the smallest standard match needs; it replaces the blocked reason and the empty-queue copy. The Courts header uses CourtFillSwitch and ShortOnPlayersBanner sits above Courts.',
    'Pass freeMinutes on a free card from courtFreeSince / freeCourtMinutes (@rotra/data/match/match.rules), falling back to the court opening or session start; the read-only and replay cards use the same FreeCourtChip.',
    'Pass onChangeLabel to show "Change court label" in the ⋯ menu; it opens CourtLabelForm.',
    'The container formats times, labels and reasons (nextEligibleForCourt, matchStatus); the card never computes them.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen:
      'Live console › Courts › courtsPane() (.court, .court.oncourt, .court.busy, .court.merged), courtMenu(), courtTimeLine()',
  },
  docs: [
    'docs/screens/product/modules/queue/session-console.md',
    'docs/business_logic/product/queue/modules/sessions/README.md',
    'docs/business_logic/product/queue/modules/queueing/README.md',
    'docs/business_logic/product/queue/modules/matches/README.md',
  ],
  variants: ['in-game', 'on-court', 'free', 'read-only'],
  // Individual booking starts control dispatch; ends remain advisory.
  related: [
    'CourtDrawing',
    'PlayerFaceButton',
    'AddCourtTile',
    'Chip',
    'OverflowMenu',
    'CourtFillSwitch',
    'ShortOnPlayersBanner',
  ],
} satisfies ComponentMeta
