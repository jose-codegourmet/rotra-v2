import type { ComponentMeta } from '@rotra/ui/meta'

export const editPlayerDetailsMeta = {
  name: 'EditPlayerDetails',
  description:
    'Saved players container for Edit details: loads ClubPlayerDetails, saves with useUpdateClubPlayerDetails, toasts "Details saved · NAME" and returns to the profile dialog.',
  usage: ['Mounted by SavedPlayers when Edit details is chosen on a guest or unclaimed profile.'],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'SHEETS.editPlayer, ACT.saveEditPlayer',
  },
  docs: ['docs/screens/product/modules/queue/players-roster.md'],
  related: ['EditPlayerDetailsForm', 'PlayerProfileSheet'],
} satisfies ComponentMeta
