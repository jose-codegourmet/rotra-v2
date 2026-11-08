import type { ComponentMeta } from '@rotra/ui/meta'
export const adminEditPlayerFormMeta = {
  name: 'AdminEditPlayerForm',
  description:
    'Shared Admin player edit and before/after review, rendered in its own sheet or embedded in Quick view. A new email is sent for review as a contact-change request, never changed here.',
  variants: ['sheet', 'embedded', 'email-changed', 'email-locked', 'email-error'],
  usage: [
    'Use on Admin Players management screens.',
    'Pass emailLocked while the player has an open contact-change request.',
    'Pass emailError when the contact-change request for the new email is refused.',
  ],
  prototype: { file: 'apps/mockup/admin-app/rotra-admin.html', screen: 'Players' },
  docs: ['docs/screens/product/modules/admin/players-requests.md'],
} satisfies ComponentMeta
