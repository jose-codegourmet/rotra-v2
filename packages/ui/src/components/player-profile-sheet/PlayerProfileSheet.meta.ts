import type { ComponentMeta } from '@rotra/ui/meta'

export const playerProfileSheetMeta = {
  name: 'PlayerProfileSheet',
  description:
    "A player's profile on operator screens: picture, identity, nickname, level suggestion, registered city, RTR ID, when they were added, sessions here and whether their phone is hidden.",
  usage: [
    'Open it from any player picture on operator screens (queue cards, match dialogs, roster, payments, leaderboard). Never on public pages.',
    'Opened from inside a dialog, pass backLabel ("suggestion", "match" or "payments") and onBack to return to that dialog in the same state; otherwise the footer says Close.',
    'The phone number is never a prop: pass only phoneHidden. Invite shows for guests and unclaimed profiles.',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'Player profile sheet (profile(sh))',
  },
  docs: [
    'docs/screens/product/modules/queue/access-home.md',
    'docs/screens/product/experience-contract.md#sensitive-and-optional-information',
  ],
  related: ['InviteSheet', 'Avatar', 'IdentityChip', 'Sheet'],
} satisfies ComponentMeta
