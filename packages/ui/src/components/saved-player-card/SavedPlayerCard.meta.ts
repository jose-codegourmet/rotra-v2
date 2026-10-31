import type { ComponentMeta } from '@rotra/ui/meta'

export const savedPlayerCardMeta = {
  name: 'SavedPlayerCard',
  description:
    'One player the club has saved: picture with an identity dot, name, nickname, level, where they are in the live session, registered city, sessions here, when they were added, identity and Invite.',
  usage: [
    'Use in the Saved players grid (inside LetterGroup). The top area is one button that opens the profile.',
    'Invite shows only for guests and unclaimed profiles. Never show the RTR ID or a phone number on the card.',
    'registeredCity comes from the RTR ID\'s city code; when unknown the card says "Not registered", or "Lookup after sync" for a pending lookup.',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'Q-SAVED-PLAYERS › playerCard() (.sp-card)',
  },
  docs: ['docs/screens/product/modules/queue/access-home.md'],
  related: ['IdentityChip', 'LevelPill', 'LetterGroup', 'SavedPlayersFilterBar'],
} satisfies ComponentMeta
