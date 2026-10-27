import type { ComponentMeta } from '@rotra/ui/meta'

export const clubSettingsMenuMeta = {
  name: 'ClubSettingsMenu',
  description:
    'The Club settings section menu (Club identity, Session defaults, Facebook post, License and payments, Downloads, Account) with Sign out.',
  usage: [
    "Place it in the settings grid's 240 px left column; it stays pinned while the page scrolls.",
    'At 760 px and below it becomes a full-width "☰ section · All settings" button that opens the menu as a left drawer (close ×, scrim, Escape; focus returns to the button).',
    "Only one drawer at a time: pass open and onOpenChange, and close the shell's navigation drawer before opening this one.",
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Club settings › .settings-nav, .settings-trigger',
  },
  docs: [
    'docs/screens/product/modules/queue/access-home.md',
    'docs/screens/product/experience-contract.md#layout-and-device-behavior',
  ],
  related: ['ClubIdentityPanel', 'SessionDefaultsPanel', 'AppShell'],
} satisfies ComponentMeta
