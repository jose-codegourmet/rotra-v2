import type { ComponentMeta } from '@rotra/ui/meta'

export const setupNotesReviewSectionMeta = {
  name: 'SetupNotesReviewSection',
  description:
    'SessionSetupForm page 3 › Notes and review: the optional notes (shown on the public page) and the review list (Session, When, Repeats, Venue, Courts, Formats, Minimum, Costs) with Edit links back to each page.',
  usage: ["Rendered inside SessionSetupForm's FormProvider only."],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'Q-SETUP › viewSetup() part 5 (Notes and review)',
  },
  docs: ['docs/screens/product/modules/queue/session-setup.md'],
  related: ['SessionSetupForm', 'KeyValueList', 'Textarea'],
} satisfies ComponentMeta
