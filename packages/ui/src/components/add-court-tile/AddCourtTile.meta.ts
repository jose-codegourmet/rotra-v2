import type { ComponentMeta } from '@rotra/ui/meta'

export const addCourtTileMeta = {
  name: 'AddCourtTile',
  description:
    'The dashed "+ Add court" tile at the end of the Courts grid: "Becomes Court N, free right away". Opens the Add a court sheet.',
  usage: [
    'Use as the last tile in Q-COURTS, after every CourtCard. Pass the next court number.',
    'It only opens Q-ADD-COURT; it never adds the court itself.',
    'Do not use in Session setup or Courts and time; those list courts as rows.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Live console › Courts › courtsPane() (.court.add-court)',
  },
  docs: ['docs/screens/product/modules/queue/session-console.md'],
  related: ['CourtCard'],
} satisfies ComponentMeta
