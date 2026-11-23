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
    'Every picture has a 3 px ring in its level band colour (Beginner blue, Intermediate yellow, Advanced red, the same tokens as the level ring elsewhere); a player with no level keeps the white edge.',
    'Pass onOpenMatch on Getting ready and Playing courts: the drawing becomes a button (pointer or grab cursor, slight brighten on hover, tooltip "Open match"). Faces still open the profile; the card keeps its Open match button for keyboards and screen readers. Free courts are never a button.',
    'Pass onDragMove to make the drawing draggable (mouse after 6 px, touch after press and hold, using the same ghost as the swap drag). It reports the id of the free court it is dropped on (a CourtCard with dropCourtId); a drop on a busy court or on nothing does nothing, and a tap still opens the match.',
    'Do not use for the queue card; it lists faces in a row, not on a court.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Live console › Courts › courtSVG(), courtSides() (.pitch, .open-pitch, .sides, .pf, .pf.lv-*, .pf-g), court drag (cdrag, cdLift, cdMove, cdEnd)',
  },
  docs: [
    'docs/screens/product/modules/queue/session-console.md',
    'docs/business_logic/product/queue/modules/matches/README.md',
    'docs/mockup-changes/2026-11-19-queue-court-faces-ring.md',
    'docs/mockup-changes/2026-11-19-queue-court-tap-opens-match.md',
    'docs/mockup-changes/2026-11-19-queue-drag-court-to-free.md',
  ],
  // freeLabel distinguishes unavailable future/removed courts from free courts.
  related: ['PlayerFaceButton', 'CourtCard'],
} satisfies ComponentMeta
