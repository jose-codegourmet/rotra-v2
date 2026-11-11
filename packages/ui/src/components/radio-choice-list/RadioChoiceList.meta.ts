import type { ComponentMeta } from '@rotra/ui/meta'

export const radioChoiceListMeta = {
  name: 'RadioChoiceList',
  description:
    'A settings radio group of full-width rows: a radio dot, a bold title and a muted helper line per choice; exactly one is chosen.',
  usage: [
    'Use for a Player setting with a few exclusive choices that each need a helper line (Profile visibility).',
    'disabled while saving or offline; pass aria-busy while a change saves.',
    'For Queue option cards in a grid use ChoiceGroup; for short labels use SegmentedControl.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'Privacy and contact › Profile visibility (.choices, .choice, .dot)',
  },
  docs: ['docs/mockup-changes/2026-11-11-player-profile-visibility-hide-from-directory.md'],
  related: ['ProfileVisibilityControl', 'ChoiceGroup', 'SegmentedControl'],
} satisfies ComponentMeta
