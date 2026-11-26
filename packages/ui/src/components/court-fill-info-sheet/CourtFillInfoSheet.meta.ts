import type { ComponentMeta } from '@rotra/ui/meta'

export const courtFillInfoSheetMeta = {
  name: 'CourtFillInfoSheet',
  description:
    'How courts get matches: a sheet with two cards, Manual Queue (switch off) and Auto Queue (switch on), each with a small drawing and three lines; the current mode is marked On now and highlighted.',
  usage: [
    'Opens from the ⓘ next to the Auto Queue switch (CourtFillSwitch onOpenInfo). The container owns open and the current mode.',
    'Footer: Close, and the primary Turn on Auto Queue (from Manual) or Switch to Manual Queue (from Auto); onSwitch receives the other mode and the container makes the change and closes the sheet.',
    'The note "Switching doesn’t move matches that are already on a court." stays under the cards.',
    'The drawings use theme tokens only, so both themes work. Auto Queue only places a match On court; it never starts one.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen:
      'Live console › Courts › SHEETS.fillInfo (.fi-card, .fi-art, .fi-list), openFillInfo, setCourtFill',
  },
  docs: [
    'docs/screens/product/modules/queue/session-console.md',
    'docs/business_logic/product/queue/modules/queueing/README.md',
    'docs/mockup-changes/2026-11-26-queue-free-court-flow.md',
  ],
  related: ['CourtFillSwitch', 'Sheet', 'Chip'],
} satisfies ComponentMeta
