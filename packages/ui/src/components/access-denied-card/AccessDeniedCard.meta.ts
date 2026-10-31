import type { ComponentMeta } from '@rotra/ui/meta'

export const accessDeniedCardMeta = {
  name: 'AccessDeniedCard',
  description: 'Bounded Admin denial for a signed-in account without platform-owner authority.',
  usage: [
    'Render instead of the workspace; accepts only an account description and sign-out callback.',
  ],
  prototype: {
    file: 'app/mocksups-app/admin-app/rotra-admin.html',
    screen: 'Access denied (viewDenied)',
  },
  docs: ['docs/screens/product/modules/admin/access-navigation.md'],
  variants: ['default', 'signing-out', 'long-account-description'],
} satisfies ComponentMeta
