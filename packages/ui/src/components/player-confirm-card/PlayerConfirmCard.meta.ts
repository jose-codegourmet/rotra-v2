import type { ComponentMeta } from '@rotra/ui/meta'

export const playerConfirmCardMeta = {
  name: 'PlayerConfirmCard',
  description:
    'The confirmation card after picking a saved or Player Information player: picture, name, RTR ID (or "Guest · no RTR ID"), identity chip, the identity check unclaimed profiles need, the Player Information suggestion and the Level for this club.',
  usage: [
    'Use inside AddPlayerSheet once a player is picked. The sheet owns level and check state and presets the level to the suggestion.',
    'Unclaimed profiles show "Confirm this is the right person" with RTR ID matches / Scanned their QR / Phone confirmed toggles; Phone confirmed is left out when phoneHidden. canConfirmPlayer() says when the primary may enable.',
    'Never pass or show a phone number: a hidden phone only says "Phone hidden by player. Use their RTR ID or QR code instead."',
    'Pass onBack and onConfirm to draw Back and "Confirm player slot" / "Add to waitlist" under the card; AddPlayerSheet leaves them out and uses its own footer.',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'SHEETS.add › pick state (Confirm player / Add player card)',
  },
  docs: [
    'docs/screens/product/modules/queue/players-roster.md#q-identify--confirm-correct-player',
    'docs/screens/product/modules/queue/players-roster.md#q-assess--club-level-selection',
    'docs/business_logic/product/queue/modules/players/README.md#identity-states',
  ],
  related: ['AddPlayerSheet', 'NewPlayerForm', 'LevelSelect', 'IdentityChip'],
} satisfies ComponentMeta
