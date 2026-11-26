import type { ComponentMeta } from '@rotra/ui/meta'

export const editPlayerDetailsMeta = {
  name: 'EditPlayerDetails',
  description:
    'Operator container for Edit details: loads ClubPlayerDetails, saves with useUpdateClubPlayerDetails, toasts "Details saved · NAME" (plus what the email did) and returns to the profile dialog. Profile picture changes (useSetClubPlayerPicture, useRemoveClubPlayerPicture, useUseClubPlayerPreviousPicture) apply at once without closing, toast "Picture updated · NAME", "Using initials · NAME" or "Previous picture restored · NAME", and show failures under the field. Characters seed from the same id and name as every other avatar.',
  usage: [
    'Mounted by usePlayerProfileActions when Edit details is chosen on a guest or unclaimed profile (Saved players, the session console and the Preparation roster).',
    'When the email typed already belongs to another saved player, useUpdateClubPlayerDetails answers samePerson (the email is not applied): the sheet becomes the Same person as NAME? ConfirmSheet. Back returns to Edit details; Move to NAME calls useMoveSavedPlayer, toasts "Moved to NAME" and opens that player\'s profile through onMoved.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'SHEETS.editPlayer, ACT.saveEditPlayer',
  },
  docs: ['docs/screens/product/modules/queue/players-roster.md'],
  related: ['EditPlayerDetailsForm', 'PlayerProfileSheet'],
} satisfies ComponentMeta
