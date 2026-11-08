import type { ComponentMeta } from '@rotra/ui/meta'
export const passwordResetRequestsMeta = {
  name: 'PasswordResetRequests',
  description: 'Admin review and private reset-link handoff after ownership verification.',
  usage: [
    'Admin > Requests > Password resets. The container owns data, mutations and clipboard access.',
  ],
  prototype: {
    file: 'apps/mockup/admin-app/rotra-admin.html',
    screen: 'A-PASSWORD-REQUESTS / viewPasswordResets',
  },
  docs: ['docs/screens/product/modules/admin/players-requests.md'],
  variants: ['pending', 'issued', 'declined', 'unmatched', 'loading', 'empty', 'error'],
} satisfies ComponentMeta
