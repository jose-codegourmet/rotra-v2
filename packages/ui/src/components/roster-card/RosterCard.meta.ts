import type { ComponentMeta } from '@rotra/ui/meta'

export const rosterCardMeta = {
  name: 'RosterCard',
  description:
    'One confirmed slot on the preparation roster grid. First level: picture, name, remove, a full-width Present band (accent tint when present, with the Switch) and a level block tinted and outlined in the skill group color (level select or “LEVEL · Fixed after start”, plus the suggestion indicator). Second level: one small muted line with the identity chip, Paid / Not paid (never green) and “Suggestion: LEVEL”.',
  usage: [
    'Pass onStepDown for the secondary Move to waitlist button on the last row (#735), before and after Start.',
    'Pass selfCheckedInAt or leftAt timestamps for the muted presence caption; the caller owns clearing rules.',
    'Use inside RosterPanel when Roster view is Grid, with compactOnPhone: at 640 px and narrower the grid is two columns and each card is compact (56 px picture centred on top, name under it, level box, chips and buttons centred, remove × in the top-right corner). Unchanged from 641 px up.',
    'Do not use for the List view: that stays RosterRow.',
    'Do not use in the live console: Queue › Players shows PlayerPoolCard.',
    'Before Start session the route passes showPresence=false: no Present band or switch. After start (levelLocked or readOnly) the level is “LEVEL · Fixed after start”, presence is Present/Away text, and remove is hidden.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Q-PREPARE › Roster and levels tab (.rv-card)',
  },
  docs: [
    'docs/screens/product/modules/queue/session-setup.md',
    'docs/mockup-changes/2026-11-06-queue-roster-views.md',
    'docs/mockup-changes/2026-11-08-queue-roster-card-emphasis.md',
    'docs/mockup-changes/2026-11-11-queue-roster-grid-mobile.md',
  ],
  related: [
    'RosterPanel',
    'RosterRow',
    'LevelSelect',
    'LevelDiffIndicator',
    'IdentityChip',
    'Switch',
  ],
} satisfies ComponentMeta
