import type { ComponentMeta } from '@rotra/ui/meta'

export const playerConfirmCardMeta = {
  name: 'PlayerConfirmCard',
  description:
    'The confirmation card after picking a saved or Player Information player: picture, name, RTR ID (or "Not registered yet" for an unclaimed profile, "Guest" otherwise), identity chip, the Player Information suggestion and the Level for this club. No identity check (withdrawn November 11, 2026).',
  usage: [
    'Use inside AddPlayerSheet when a pick has no level: the sheet owns the level state and presets it to the suggestion. A pick with a level is added in one tap and never shows this card.',
    'Never pass or show a phone number: a hidden phone only says "Phone hidden by player. Use their RTR ID or QR code instead."',
    'Pass onBack and onConfirm to draw Back and "Confirm player slot" / "Add to waitlist" under the card; AddPlayerSheet leaves them out and uses its own footer.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'SHEETS.add › pick state (Add player card)',
  },
  docs: [
    'docs/mockup-changes/2026-11-11-queue-club-only-unclaimed.md',
    'docs/screens/product/modules/queue/players-roster.md#q-assess--club-level-selection',
    'docs/business_logic/product/queue/modules/players/README.md#identity-states',
  ],
  related: ['AddPlayerSheet', 'NewPlayerForm', 'LevelSelect', 'IdentityChip'],
} satisfies ComponentMeta
