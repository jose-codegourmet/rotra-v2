import type { ComponentMeta } from '@rotra/ui/meta'
export const adminNavMeta = {
  name: 'AdminNav',
  description:
    'Admin navigation composed from the Foundation SideRail. Club names sits beside Contact changes under Requests as a prototype placeholder placement.',
  usage: ['Use in the Admin workspace shell.'],
  prototype: { file: 'docs/frames/admin-app/rotra-admin.html', screen: 'left rail (rail)' },
  docs: ['docs/screens/product/modules/admin/access-navigation.md'],
  variants: [
    'clubs',
    'players',
    'contact-changes',
    'club-names',
    'ranking',
    'feature-flags',
    'no-counts',
    'zero-counts',
  ],
} satisfies ComponentMeta
