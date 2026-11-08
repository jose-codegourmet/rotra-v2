import type { ComponentMeta } from '@rotra/ui/meta'

export const rosterCardMeta = {
  name: 'RosterCard',
  description:
    'One confirmed slot on the preparation roster grid. First level: picture, name, remove, a full-width Present band (accent tint when present, with the Switch) and a level block tinted and outlined in the skill group color (level select or “LEVEL · Fixed after start”, plus the suggestion indicator). Second level: one small muted line with the identity chip, Paid / Not paid (never green) and “Suggestion: LEVEL”.',
  usage: [
    'Use inside RosterPanel when Roster view is Grid.',
    'Do not use for the List view: that stays RosterRow.',
    'Do not use in the live console: Queue › Players shows PlayerPoolCard.',
    'After start (levelLocked or readOnly) the level is “LEVEL · Fixed after start”, presence is Present/Away text, and remove is hidden.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Q-PREPARE › Roster and levels tab (.rv-card)',
  },
  docs: [
    'docs/screens/product/modules/queue/session-setup.md',
    'docs/mockup-changes/2026-11-06-queue-roster-views.md',
    'docs/mockup-changes/2026-11-08-queue-roster-card-emphasis.md',
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
