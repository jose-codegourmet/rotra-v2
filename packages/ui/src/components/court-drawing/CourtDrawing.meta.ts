import type { ComponentMeta } from '@rotra/ui/meta'

export const courtDrawingMeta = {
  name: 'CourtDrawing',
  description:
    'A badminton court drawn to real proportions (134 × 61 per court) with a dashed net and each team’s pictures on its side; two courts stack into one merged area for 5v5. A free court draws in neutral colours with a "Free" label.',
  usage: [
    'Use inside CourtCard (in game and free) and the public page’s court strip. Pass courts={2} for a 5v5 match on two courts.',
    'Players stack top to bottom on their side (P1 over P2 | P3 over P4); teams of 3 or more wrap into a second column. Sizes follow the team size.',
    'Do not use for the queue card; it lists faces in a row, not on a court.',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'Live console › Courts › courtSVG(), courtSides() (.pitch, .sides, .pf)',
  },
  docs: [
    'docs/screens/product/modules/queue/session-console.md',
    'docs/business_logic/product/queue/modules/matches/README.md',
  ],
  related: ['PlayerFaceButton', 'CourtCard'],
} satisfies ComponentMeta
