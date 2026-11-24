import type { ComponentMeta } from '@rotra/ui/meta'

export const publicQueueMatchDialogMeta = {
  name: 'PublicQueueMatchDialog',
  description:
    'The View match dialog on the public session page\'s Queue: one waiting match drawn on a court (two separate courts with a "Uses 2 courts" chip above six players), its place in the queue and a note that the Queue Master can still change it.',
  usage: [
    'Opened by the eye button on a PublicSessionQueue tile; PublicSessionQueue owns the open state.',
    'Title is "Queue #N · <match label>"; position 1 reads "Next on a court.", the rest "Waiting in queue.".',
    'Faces carry the level ring only (grey when not assessed); no levels or scores are written out. Names stay per the public rule (masked guests as "Y***").',
    'Pass match={null} when the match left the queue meanwhile: the body reads "This match has left the queue.".',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'SHEETS.pubQueueMatch, pubCourtSides, .qm-pitch',
  },
  docs: [
    'docs/mockup-changes/2026-11-19-queue-public-queue-compact.md',
    'docs/screens/product/modules/queue/public-session.md',
  ],
  related: ['PublicSessionQueue', 'Sheet', 'CourtDrawing', 'Chip'],
} satisfies ComponentMeta
