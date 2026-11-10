import type { ComponentMeta } from '@rotra/ui/meta'

export const publicAccountBarMeta = {
  name: 'PublicAccountBar',
  description:
    "The session page's slim sticky top bar: ROTRA, the theme toggle and the visitor's ROTRA Player sign-in. Signed out it shows Log in; signed in, a pill with the Player's picture and first name opens a menu with their name and RTR ID, My ROTRA profile and Sign out.",
  usage: [
    'Use only on the public session page (and its operator preview, which passes viewer={null}). Operator screens use TopBar inside AppShell.',
    'Pass viewer={null} for a visitor or a guest with a request; loginHref is the Player login that returns to this page.',
    "shortName is the Player's nickname or first name; the pill truncates it at 14 characters.",
    'My ROTRA profile shows only when the viewer has an RTR ID; profileHref opens in a new tab.',
    'Set signingOut while the sign-out call runs; the screen then refetches and shows the visitor view with the toast "Signed out".',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Public session page › top bar (pubTopBar, .acct, .acct-menu)',
  },
  docs: [
    'docs/screens/product/modules/queue/public-session.md',
    'docs/business_logic/product/queue/modules/players/README.md#join-requests-from-the-session-link',
  ],
  variants: ['signed out', 'signed in', 'menu open', 'long name', 'signing out'],
  related: ['TopBar', 'ThemeToggle', 'Avatar', 'OverflowMenu'],
} satisfies ComponentMeta
