import type { ComponentMeta } from '@rotra/ui/meta'

export const freeCourtSheetMeta = {
  name: 'FreeCourtSheet',
  description:
    '"Court N is free": the dialog a free court\'s picture opens. "Choose how this court gets its next match." and two large choices, Pick from the queue (list icon, "N matches waiting. Choose one for Court N.", disabled with "The Main Queue is empty.") and Generate a match (grid icon), with Cancel.',
  usage: [
    "Open it from the free court card's picture (Tap to fill). Pass waitingCount from the Main Queue; with 0 the first choice is disabled and says why.",
    "onPick opens ChooseMatchSheet (Put a match on Court N); onGenerate opens SuggestedMatchSheet for that court. Both stack over this sheet and ← Back returns here; the back stack is the container's (Q29.7).",
    'Two columns from 481 px, one column on a phone.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'SHEETS.freeCourt (.fc-picks, .fc-pick)',
  },
  docs: [
    'docs/screens/product/modules/queue/session-console.md',
    'docs/mockup-changes/2026-11-26-queue-free-court-flow.md',
  ],
  related: ['CourtCard', 'ChooseMatchSheet', 'SuggestedMatchSheet', 'Sheet'],
} satisfies ComponentMeta
