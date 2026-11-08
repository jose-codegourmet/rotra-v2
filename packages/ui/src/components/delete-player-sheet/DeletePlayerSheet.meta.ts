import type { ComponentMeta } from '@rotra/ui/meta'

export const deletePlayerSheetMeta = {
  name: 'DeletePlayerSheet',
  description:
    'D-DELETE-PLAYER: confirms deleting a saved player who is in the Active Session (marked not present, waiting matches need attention), or explains that a player on court cannot be deleted yet.',
  usage: [
    'Only for a player in the Active Session; anywhere else Delete player acts at once.',
    'Presentational; the container reads the delete impact and runs the delete.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'SHEETS.deletePlayer',
  },
  docs: ['docs/screens/product/dialogs.md#d-delete-player--delete-saved-player'],
  related: ['ConfirmSheet', 'PlayerProfileSheet', 'DeleteSessionSheet'],
} satisfies ComponentMeta
