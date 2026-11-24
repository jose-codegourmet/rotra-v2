import type { ComponentMeta } from '@rotra/ui/meta'

export const setupRestrictionsFieldMeta = {
  name: 'SetupRestrictionsField',
  description:
    'SessionSetupForm page 2 › Formats and mode › Restrictions: which levels can take a slot, one pick as choice cards (All levels, Beginners only, Beginners to intermediate, Slots per level). Slots per level adds Beginner, Intermediate and Advanced number fields with a running "N of CAP slots · matches the session / X left to place / X too many" line, and a hint.',
  usage: [
    'Rendered inside SessionSetupForm’s FormProvider only (SetupFormatsSection places it above Mode). It reads and writes the form’s levelRestriction ({ kind, slots? }, the shared field in @rotra/schema/level-restriction) and reads courtLabels and playersPerCourt for the capacity.',
    'Picking Slots per level the first time splits the session’s slots across the three levels (the rest to Beginner); the numbers survive switching away and back within the form. The other picks carry no slots.',
    'Slots per level must be whole numbers, 0 or more, adding up to courts × players per court before saving. A refused save shows "The slots add up to N; this session has CAP (C courts × P)." or "Use whole numbers, 0 or more." under the fields; the running line turns red until the numbers match.',
    'Players outside the pick can’t request from the session page; the Queue Master can still add them after a warning (JoinRequestsPanel levelBlock, AddPlayer). Players with no level can request.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Q-SETUP › Formats and mode › Restrictions (RESTRICT, restrictError, ACT.setRestrict)',
  },
  docs: [
    'docs/screens/product/modules/queue/session-setup.md',
    'docs/mockup-changes/2026-11-19-queue-level-restrictions.md',
  ],
  related: ['SetupFormatsSection', 'SessionSetupForm', 'ChoiceGroup', 'JoinRequestCard'],
} satisfies ComponentMeta
