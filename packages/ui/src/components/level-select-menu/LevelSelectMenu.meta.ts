import type { ComponentMeta } from '@rotra/ui/meta'

export const levelSelectMenuMeta = {
  name: 'LevelSelectMenu',
  description:
    'A coloured select menu for a session level: the button is filled in the band colour (Beginner blue, Intermediate yellow, Advanced red; dashed and muted with "Choose a level…" when none) with a dot, the level name and a chevron. It opens a listbox of the three bands as tinted groups of Low · Mid · High; the current level is filled in its colour with a check.',
  usage: [
    'Use on Q-PREP roster rows and cards (list and grid) before Start; after Start the roster shows "Fixed after start" text instead.',
    'Picking closes the menu, calls onChange and returns focus to the button; Esc or a click outside closes it. The container saves with the same commit and toast as before.',
    'Pass aria-describedby pointing at the LevelDiffIndicator. Other places that pick a level (Add player, join requests, waitlist) keep LevelSelect for now.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'lvMenu(), rvLevel(), ACT.lvMenuToggle / ACT.lvMenuPick, .lvm* styles',
  },
  docs: [
    'docs/screens/product/modules/queue/players-roster.md',
    'docs/mockup-changes/2026-11-13-queue-level-select-menu.md',
  ],
  variants: ['beginner', 'intermediate', 'advanced', 'no level', 'open'],
  related: ['LevelSelect', 'LevelDiffIndicator', 'RosterRow', 'RosterCard'],
} satisfies ComponentMeta
