import type { ComponentMeta } from '@rotra/ui/meta'

export const setupCourtPictureMeta = {
  name: 'SetupCourtPicture',
  description:
    'One booked court in Session setup step 1: a top-down badminton court (green, white boundary, singles side lines, service lines, center lines, dashed net) with its label on it. Under it, the budgeted players on the left and the planned times on the right (“Session start – Session end” unless set). The whole picture is a button that opens Edit Court N.',
  usage: [
    'Use one per court under the Courts booked and Players per court steppers in Session setup. Pass the same players count to every picture; changing players per court updates every caption.',
    'Pass plannedStart and plannedEnd as display text only when the court has its own time; leave them empty to show “Session start” and “Session end”.',
    'Set invalid when the court has a time error and point errorId at the error message shown under the pictures. The component never opens the dialog itself.',
    'Wrap the pictures in SetupCourtPictureGrid. Pass a ref (or id) so focus returns to the picture when the dialog closes. Do not use on the live console; use CourtDrawing there.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Create / Edit session › step 1 › Courts (.sc-tiles, .sc-tile, setupCourtSVG())',
  },
  docs: [
    'docs/screens/product/modules/queue/session-setup.md',
    'docs/mockup-changes/2026-11-08-queue-setup-court-pictures.md',
  ],
  related: ['CourtDrawing', 'CountStepper'],
} satisfies ComponentMeta
