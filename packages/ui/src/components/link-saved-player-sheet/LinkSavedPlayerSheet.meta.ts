import type { ComponentMeta } from '@rotra/ui/meta'

export const linkSavedPlayerSheetMeta = {
  name: 'LinkSavedPlayerSheet',
  description:
    'Saved players › a guest\'s profile › Link to saved player…: "Link NAME to a saved player" with the helper, a Search saved players field (name, nickname or RTR ID), the saved-player list (picture, name, RTR ID or "Guest", identity chip), "No saved player matches." when empty, and Back.',
  usage: [
    "Opened from PlayerProfileSheet's Link to saved player… (guests only). Pass the saved players other than the guest, sorted by name; the sheet only applies the search.",
    'onChoose reports the picked club player id and nothing else: the merge and the "Linked to NAME" toast belong to the container. onBack returns to the guest\'s profile.',
    'The search resets when the sheet unmounts; render it only while open. Not PlayerPickerSheet, which is a lineup picker for session players.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Q-SAVED-PLAYERS › SHEETS.linkPlayer (.sel-list, .opt)',
  },
  docs: ['docs/screens/product/modules/queue/players-roster.md'],
  related: [
    'PlayerProfileSheet',
    'SavedPlayerCard',
    'IdentityChip',
    'Avatar',
    'TextInput',
    'Sheet',
  ],
} satisfies ComponentMeta
