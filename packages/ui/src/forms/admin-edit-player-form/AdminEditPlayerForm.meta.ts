import type { ComponentMeta } from '@rotra/ui/meta'
export const adminEditPlayerFormMeta = {
  name: 'AdminEditPlayerForm',
  description:
    'A-PLAYER-EDIT: Admin edits everything a player can change, plus phone, email and the beta-only Password *(for MVP or beta only)*, with one Reason for the change. Embedded in the Quick view side panel, whose footer Save changes submits it.',
  variants: [
    'registered',
    'unclaimed',
    'field-errors',
    'reason-missing',
    'nothing-changed',
    'stale-revision',
    'saving',
    'long-text',
  ],
  usage: [
    'Use inside AdminPlayerQuickView edit mode; the footer button uses form="admin-edit-player-<id>".',
    'Pass the loaded AdminPlayerEdit as player and the shown library characters.',
    'Pass the data layer field errors (MockError fieldErrors) as fieldErrors; the first one is focused.',
    "Pass cropPhoto (the container crops uploads to a square data URL, as ClubPictureField's caller does).",
    'Offline: Save changes stays on; the save is refused by the data layer and the container toasts the offline error (as the prototype).',
    'onNothingChanged handles "Nothing changed." without sending; the container toasts and closes.',
    'The password field is for MVP or beta only (D-2026-11-09-14, end date not set) and is off for unclaimed players.',
  ],
  prototype: { file: 'apps/mockup/admin-app/rotra-admin.html', screen: 'Players' },
  docs: ['docs/screens/product/modules/admin/players-requests.md'],
} satisfies ComponentMeta
