import type { ComponentMeta } from '@rotra/ui/meta'

export const courtDrawingMeta = {
  name: 'CourtDrawing',
  description:
    'A badminton court drawn to real proportions (134 × 61 per court) with a dashed net and each team’s pictures on its side; two courts stack into one merged area for 5v5. Pictures and names scale with the court width. Each picture can show a game-count badge. A free court draws in neutral colours with a "Free" label.',
  usage: [
    'Use inside CourtCard (in game and free) and the public page’s court strip. Pass courts={2} for a 5v5 match on two courts.',
    'Pass tall for a larger lineup on a single stretched court. It changes the aspect ratio, not the number of court markings.',
    'Players stack top to bottom on their side (P1 over P2 | P3 over P4); teams of 3 or more wrap into a second column. Picture and name sizes use container query units so they grow from a 222 px card up to a wide card; do not size them through PlayerFaceButton.',
    'Pass each player’s completed games this session and the session minimum so the badge and accessible name read “NAME, Team A, G of MIN games. View profile”. When the minimum is omitted, the accessible name says “G games played”. Omit games to hide the badge.',
    'Pass showLevels for abbreviated skill labels under each name, including No level when unassigned. Skill-label backgrounds and band tints stay fixed in both themes, as in the prototype.',
    'Do not use for the queue card; it lists faces in a row, not on a court.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Live console › Courts › courtSVG(), courtSides() (.pitch, .sides, .pf, .pf-g)',
  },
  docs: [
    'docs/screens/product/modules/queue/session-console.md',
    'docs/business_logic/product/queue/modules/matches/README.md',
  ],
  // freeLabel distinguishes unavailable future/removed courts from free courts.
  related: ['PlayerFaceButton', 'CourtCard'],
} satisfies ComponentMeta
